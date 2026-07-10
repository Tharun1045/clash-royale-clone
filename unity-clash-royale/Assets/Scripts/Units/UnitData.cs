using UnityEngine;

namespace ClashClone.Units
{
    [CreateAssetMenu(fileName = "NewUnitData", menuName = "Clash Clone/Unit Data")]
    public class UnitData : ScriptableObject
    {
        [Header("Identity")]
        [SerializeField] private string unitName = "New Unit";

        [Header("Movement")]
        [SerializeField] private float maxHp = 500f;
        [SerializeField] private float speed = 2f;
        [SerializeField] private bool isAir = false;

        [Header("Combat Stats")]
        [SerializeField] private float damage = 50f;
        [SerializeField] private float attackRange = 1.5f;
        [SerializeField] private float attackRate = 1.2f; // Seconds per attack
        [SerializeField] private TargetType targetPreference = TargetType.Any;

        // Public properties
        public string UnitName => unitName;
        public float MaxHp => maxHp;
        public float Speed => speed;
        public bool IsAir => isAir;
        public float Damage => damage;
        public float AttackRange => attackRange;
        public float AttackRate => attackRate;
        public TargetType TargetPreference => targetPreference;
    }

    public enum TargetType
    {
        Any,          // Targets ground and air
        GroundOnly,   // Targets ground units and towers
        AirOnly,      // Targets air units only
        TowersOnly    // Ignores all units, paths directly to towers/buildings
    }
}
