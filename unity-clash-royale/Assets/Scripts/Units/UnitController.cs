using ClashClone.Combat;
using System;
using UnityEngine;

namespace ClashClone.Units
{
    [RequireComponent(typeof(Health))]
    public class UnitController : MonoBehaviour
    {
        public enum TeamType { Blue, Red }

        [Header("Unit settings")]
        [SerializeField] private UnitData stats;
        [SerializeField] private TeamType team = TeamType.Blue;

        public UnitData Stats => stats;
        public TeamType Team => team;
        public Health Health { get; private set; }
        public UnitMovement Movement { get; private set; }
        public UnitCombat Combat { get; private set; }

        public static event Action<UnitController> OnUnitSpawned;
        public static event Action<UnitController> OnUnitDied;

        private void Awake()
        {
            Health = GetComponent<Health>();
            Movement = GetComponent<UnitMovement>();
            Combat = GetComponent<UnitCombat>();
        }

        private void Start()
        {
            if (stats != null)
            {
                Health.Initialize(stats.MaxHp);
            }
            else
            {
                Debug.LogError($"UnitController on [{gameObject.name}] is missing its UnitData stats configuration!");
            }

            OnUnitSpawned?.Invoke(this);
        }

        private void OnEnable()
        {
            Health.OnDeath += HandleDeath;
        }

        private void OnDisable()
        {
            Health.OnDeath -= HandleDeath;
        }

        private void HandleDeath()
        {
            Debug.Log($"Unit [{gameObject.name}] of Team [{team}] has died.");
            
            // Disable actions and movement
            if (Movement != null) Movement.enabled = false;
            if (Combat != null) Combat.enabled = false;

            // Trigger death events
            OnUnitDied?.Invoke(this);

            // Destroy object after short delay to allow visual feedback/particle triggers
            Destroy(gameObject, 1.0f);
        }
    }
}
