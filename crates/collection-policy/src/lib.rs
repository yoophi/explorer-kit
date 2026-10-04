//! Pure collection and rating rules. Persistence, schemas and error text belong to apps.

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum UpsertResult {
    Inserted,
    Replaced,
}

pub fn upsert_by_key<T, K: Eq>(
    items: &mut Vec<T>,
    item: T,
    key_of: impl Fn(&T) -> &K,
) -> UpsertResult {
    if let Some(index) = items
        .iter()
        .position(|existing| key_of(existing) == key_of(&item))
    {
        items[index] = item;
        UpsertResult::Replaced
    } else {
        items.push(item);
        UpsertResult::Inserted
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum GroupError {
    Missing,
    MinimumGroups,
}

/// Removes every group with the key, then moves an active key that was removed to the first
/// remaining group. A missing group and minimum-size failure leave all inputs intact.
pub fn remove_by_key<T, K: Clone + Eq>(
    items: &mut Vec<T>,
    active: &mut Option<K>,
    key: &K,
    minimum_groups: usize,
    key_of: impl Fn(&T) -> &K,
) -> Result<(), GroupError> {
    let removed_count = items.iter().filter(|item| key_of(item) == key).count();
    if removed_count == 0 {
        return Err(GroupError::Missing);
    }
    if items.len() - removed_count < minimum_groups {
        return Err(GroupError::MinimumGroups);
    }
    items.retain(|item| key_of(item) != key);
    if active.as_ref() == Some(key) {
        *active = items.first().map(|item| key_of(item).clone());
    }
    Ok(())
}

pub fn select_active_by_key<T, K: Clone + Eq>(
    items: &[T],
    active: &mut Option<K>,
    key: &K,
    key_of: impl Fn(&T) -> &K,
) -> Result<(), GroupError> {
    if !items.iter().any(|item| key_of(item) == key) {
        return Err(GroupError::Missing);
    }
    *active = Some(key.clone());
    Ok(())
}

/// Construct through `new`; callers cannot bypass step validation.
/// ```compile_fail
/// use explorer_collection_policy::RatingScale;
/// let invalid = RatingScale { min: 0.0, max: 1.0, step: 0.1 };
/// ```
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RatingScale {
    min: f64,
    max: f64,
    step: f64,
}

impl RatingScale {
    /// Exact-grid scale. Only normal powers of two are supported as a step;
    /// decimal steps such as 0.1 require a separately specified tolerance.
    pub fn new(min: f64, max: f64, step: f64) -> Option<Self> {
        let normal_power_of_two = step.is_normal() && step.to_bits() & ((1_u64 << 52) - 1) == 0;
        let aligned = |bound: f64| {
            let units = bound / step;
            units.is_finite() && units.fract() == 0.0
        };
        (min.is_finite()
            && max.is_finite()
            && min <= max
            && normal_power_of_two
            && step > 0.0
            && aligned(min)
            && aligned(max))
        .then_some(Self { min, max, step })
    }

    pub fn contains_f64(self, value: f64) -> bool {
        value.is_finite()
            && (self.min..=self.max).contains(&value)
            && ((value - self.min) / self.step).fract() == 0.0
    }

    pub fn contains_f32(self, value: f32) -> bool {
        self.contains_f64(f64::from(value))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, PartialEq)]
    struct Group {
        id: String,
        label: &'static str,
    }

    #[test]
    fn upsert_keeps_position_and_uses_generic_key() {
        let mut groups = vec![
            Group {
                id: "a".into(),
                label: "old",
            },
            Group {
                id: "b".into(),
                label: "b",
            },
        ];
        assert_eq!(
            upsert_by_key(
                &mut groups,
                Group {
                    id: "a".into(),
                    label: "new"
                },
                |g| &g.id
            ),
            UpsertResult::Replaced
        );
        assert_eq!(groups[0].label, "new");
        assert_eq!(
            upsert_by_key(
                &mut groups,
                Group {
                    id: "c".into(),
                    label: "c"
                },
                |g| &g.id
            ),
            UpsertResult::Inserted
        );
        assert_eq!(groups[2].id, "c");
    }

    #[test]
    fn remove_checks_missing_and_last_before_mutation_and_falls_back() {
        let mut groups = vec![
            Group {
                id: "a".into(),
                label: "a",
            },
            Group {
                id: "b".into(),
                label: "b",
            },
        ];
        let mut active = Some("b".to_string());
        assert_eq!(
            remove_by_key(&mut groups, &mut active, &"missing".into(), 1, |g| &g.id),
            Err(GroupError::Missing)
        );
        assert_eq!(active.as_deref(), Some("b"));
        remove_by_key(&mut groups, &mut active, &"b".into(), 1, |g| &g.id).unwrap();
        assert_eq!(active.as_deref(), Some("a"));
        assert_eq!(
            remove_by_key(&mut groups, &mut active, &"a".into(), 1, |g| &g.id),
            Err(GroupError::MinimumGroups)
        );
        assert_eq!(groups.len(), 1);
        assert_eq!(
            select_active_by_key(&groups, &mut active, &"missing".into(), |g| &g.id),
            Err(GroupError::Missing)
        );
    }

    #[test]
    fn rating_scales_keep_app_boundaries_and_reject_non_finite_values() {
        let folder = RatingScale::new(1.0, 5.0, 0.5).unwrap();
        let bookmark = RatingScale::new(0.0, 5.0, 0.5).unwrap();
        for value in [1.0_f32, 1.5, 5.0] {
            assert!(folder.contains_f32(value));
        }
        for value in [0.0_f64, 0.5, 5.0] {
            assert!(bookmark.contains_f64(value));
        }
        for value in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY, -0.5, 5.5, 1.25] {
            assert!(!bookmark.contains_f64(value));
        }
        assert!(!folder.contains_f32(0.0));
        assert!(!folder.contains_f32(f32::NAN));
        assert!(RatingScale::new(0.0, 5.0, 0.0).is_none());
        assert!(RatingScale::new(0.0, f64::INFINITY, 0.5).is_none());
        assert!(RatingScale::new(0.0, 1.0, 0.1).is_none());
        assert!(RatingScale::new(0.1, 1.0, 0.25).is_none());
        assert!(RatingScale::new(0.0, 1.1, 0.25).is_none());
        assert!(RatingScale::new(0.0, 1.0, 0.25).unwrap().contains_f64(0.75));
        assert!(!folder.contains_f32(1.0000001));
        assert!(!bookmark.contains_f64(0.5000000000000001));
    }

    #[test]
    fn duplicate_keys_are_removed_together_without_breaking_minimum() {
        let mut groups = vec![
            Group {
                id: "a".into(),
                label: "first",
            },
            Group {
                id: "a".into(),
                label: "second",
            },
        ];
        let mut active = Some("a".to_string());
        assert_eq!(
            remove_by_key(&mut groups, &mut active, &"a".into(), 1, |g| &g.id),
            Err(GroupError::MinimumGroups)
        );
        assert_eq!(groups.len(), 2);
        groups.push(Group {
            id: "b".into(),
            label: "other",
        });
        remove_by_key(&mut groups, &mut active, &"a".into(), 1, |g| &g.id).unwrap();
        assert_eq!(groups.len(), 1);
        assert_eq!(active.as_deref(), Some("b"));
    }
}
