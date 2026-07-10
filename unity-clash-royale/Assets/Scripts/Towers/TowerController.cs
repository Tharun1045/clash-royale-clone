using ClashClone.Combat;
using ClashClone.Core;
using ClashClone.Units;
using System;
using UnityEngine;

namespace ClashClone.Towers
{
    [RequireComponent(typeof(Health))]
    public class TowerController : MonoBehaviour, IDamageable
    {
        public enum TowerType { King, Princess }

        [Header("Identity")]
        [SerializeField] private string towerId = "Blue_King";
        [SerializeField] private UnitController.TeamType team = UnitController.TeamType.Blue;
        [SerializeField] private TowerType type = TowerType.Princess;

        [Header("Combat Configuration")]
        [SerializeField] private float maxHp = 2500f;
        [SerializeField] private float attackRange = 7.5f;
        [SerializeField] private float damage = 50f;
        [SerializeField] private float attackRate = 0.8f; // Seconds between attacks

        [Header("Visual Elements")]
        [SerializeField] private GameObject projectilePrefab;
        [SerializeField] private Transform projectileSpawnPoint;
        [SerializeField] private GameObject destroyedVfxPrefab;

        private Health health;
        private Transform currentTarget;
        private float lastAttackTime;

        public string TowerId => towerId;
        public UnitController.TeamType Team => team;
        public TowerType Type => type;

        // IDamageable delegate mappings
        public float CurrentHealth => health.CurrentHealth;
        public float MaxHealth => health.MaxHealth;
        public bool IsDead => health.IsDead;

        public static event Action<TowerController> OnTowerDestroyed;

        private void Awake()
        {
            health = GetComponent<Health>();
        }

        private void Start()
        {
            health.Initialize(maxHp);
            health.OnDeath += HandleDeath;
        }

        private void OnDestroy()
        {
            health.OnDeath -= HandleDeath;
        }

        private void Update()
        {
            if (IsDead) return;

            ScanForUnits();

            if (currentTarget != null)
            {
                // Verify target is still valid
                IDamageable targetHealth = currentTarget.GetComponent<IDamageable>();
                if (targetHealth == null || targetHealth.IsDead || Vector3.Distance(transform.position, currentTarget.position) > attackRange)
                {
                    currentTarget = null;
                    return;
                }

                // Attack on cooldown
                if (Time.time - lastAttackTime >= attackRate)
                {
                    ShootProjectile();
                }
            }
        }

        private void ScanForUnits()
        {
            if (currentTarget != null) return;

            Collider[] targetsInRadius = Physics.OverlapSphere(transform.position, attackRange);
            Transform nearestEnemy = null;
            float nearestDistance = float.MaxValue;

            foreach (var col in targetsInRadius)
            {
                UnitController unit = col.GetComponent<UnitController>();
                if (unit != null && unit.Team != team && !unit.Health.IsDead)
                {
                    float dist = Vector3.Distance(transform.position, col.transform.position);
                    if (dist < nearestDistance)
                    {
                        nearestDistance = dist;
                        nearestEnemy = col.transform;
                    }
                }
            }

            currentTarget = nearestEnemy;
        }

        private void ShootProjectile()
        {
            lastAttackTime = Time.time;
            
            if (projectilePrefab != null)
            {
                Vector3 spawnPos = projectileSpawnPoint != null ? projectileSpawnPoint.position : transform.position + Vector3.up * 3f;
                GameObject projObj = Instantiate(projectilePrefab, spawnPos, Quaternion.identity);
                Projectile projectile = projObj.GetComponent<Projectile>();
                if (projectile != null)
                {
                    projectile.Launch(currentTarget, damage);
                }
            }
            else
            {
                // Fallback direct damage
                currentTarget.GetComponent<IDamageable>()?.TakeDamage(damage);
                Debug.Log($"[{gameObject.name}] executed tower shot on [{currentTarget.name}] for {damage} damage.");
            }
        }

        public void TakeDamage(float amount)
        {
            health.TakeDamage(amount);
        }

        public void Heal(float amount)
        {
            health.Heal(amount);
        }

        private void HandleDeath()
        {
            Debug.Log($"Tower [{towerId}] has been destroyed!");

            // Spawn explosion effect
            if (destroyedVfxPrefab != null)
            {
                Instantiate(destroyedVfxPrefab, transform.position, Quaternion.identity);
            }

            // If opponent princess tower is destroyed, expand player zone boundaries
            if (team == UnitController.TeamType.Red && type == TowerType.Princess)
            {
                if (DeploymentManager.Instance != null)
                {
                    // Expand player deployment grid border past the river!
                    DeploymentManager.Instance.AdjustPlayerZoneZMax(6f);
                }
            }

            OnTowerDestroyed?.Invoke(this);

            // Change mesh model / representation to ruins or hide object
            // (In actual game we replace mesh; for mock prototype we just deactivate renderer or leave object)
            Collider col = GetComponent<Collider>();
            if (col != null) col.enabled = false;

            // Make tower ruins look hollow
            Renderer rend = GetComponent<Renderer>();
            if (rend != null) rend.material.color = Color.gray;
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.yellow;
            Gizmos.DrawWireSphere(transform.position, attackRange);
        }
    }
}
