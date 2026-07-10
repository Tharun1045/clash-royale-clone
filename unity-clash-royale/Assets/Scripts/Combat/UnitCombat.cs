using ClashClone.Units;
using System.Collections;
using UnityEngine;

namespace ClashClone.Combat
{
    [RequireComponent(typeof(UnitController))]
    public class UnitCombat : MonoBehaviour
    {
        private UnitController controller;
        private Transform currentTarget;
        private float lastAttackTime;
        private float scanInterval = 0.25f;
        private bool isScanning = true;

        [Header("Targeting setup")]
        [SerializeField] private float detectionRadius = 8f;
        [SerializeField] private GameObject projectilePrefab;
        [SerializeField] private Transform projectileSpawnPoint;

        public Transform CurrentTarget => currentTarget;

        private void Awake()
        {
            controller = GetComponent<UnitController>();
        }

        private void Start()
        {
            StartCoroutine(TargetScanningLoop());
        }

        private IEnumerator TargetScanningLoop()
        {
            while (isScanning)
            {
                ScanForTargets();
                yield return new WaitForSeconds(scanInterval);
            }
        }

        private void ScanForTargets()
        {
            // If we already have a target and it's alive, keep it (unless it runs out of range)
            if (currentTarget != null)
            {
                IDamageable targetHealth = currentTarget.GetComponent<IDamageable>();
                if (targetHealth != null && !targetHealth.IsDead)
                {
                    float distance = Vector3.Distance(transform.position, currentTarget.position);
                    if (distance <= detectionRadius)
                    {
                        return; // Current target is still valid
                    }
                }
            }

            // Find nearest enemy in radius
            Collider[] hitColliders = Physics.OverlapSphere(transform.position, detectionRadius);
            Transform nearestEnemy = null;
            float nearestDistance = float.MaxValue;

            foreach (var col in hitColliders)
            {
                // Check if collider is a Unit
                UnitController enemyUnit = col.GetComponent<UnitController>();
                if (enemyUnit != null && enemyUnit.Team != controller.Team && !enemyUnit.Health.IsDead)
                {
                    // Giants target towers only
                    if (controller.Stats.TargetPreference == TargetType.TowersOnly) continue;

                    float dist = Vector3.Distance(transform.position, col.transform.position);
                    if (dist < nearestDistance)
                    {
                        nearestDistance = dist;
                        nearestEnemy = col.transform;
                    }
                }

                // Check if collider is a Tower
                // (TowerController will implement IDamageable)
                IDamageable towerObj = col.GetComponent<IDamageable>();
                if (towerObj != null && !towerObj.IsDead)
                {
                    // Verify if it is an enemy tower (using tag or a tower team property)
                    bool isEnemyTower = false;
                    
                    // Simple tag/name checks for local prototypes
                    if (controller.Team == UnitController.TeamType.Blue && col.gameObject.name.Contains("Red")) isEnemyTower = true;
                    if (controller.Team == UnitController.TeamType.Red && col.gameObject.name.Contains("Blue")) isEnemyTower = true;

                    if (isEnemyTower)
                    {
                        float dist = Vector3.Distance(transform.position, col.transform.position);
                        if (dist < nearestDistance)
                        {
                            nearestDistance = dist;
                            nearestEnemy = col.transform;
                        }
                    }
                }
            }

            currentTarget = nearestEnemy;
        }

        private void Update()
        {
            if (currentTarget == null) return;

            IDamageable targetHealth = currentTarget.GetComponent<IDamageable>();
            if (targetHealth == null || targetHealth.IsDead)
            {
                currentTarget = null;
                return;
            }

            // Check distance
            float distance = Vector3.Distance(transform.position, currentTarget.position);
            if (distance <= controller.Stats.AttackRange)
            {
                // Attack on cooldown
                if (Time.time - lastAttackTime >= controller.Stats.AttackRate)
                {
                    ExecuteAttack(targetHealth);
                }
            }
        }

        private void ExecuteAttack(IDamageable target)
        {
            lastAttackTime = Time.time;
            
            // Rotate towards target
            Vector3 lookDirection = (currentTarget.position - transform.position).normalized;
            lookDirection.y = 0;
            if (lookDirection != Vector3.zero)
            {
                transform.rotation = Quaternion.LookRotation(lookDirection);
            }

            // Visual feedback (Trigger Animator hooks if present)
            Animator animator = GetComponent<Animator>();
            if (animator != null)
            {
                animator.SetTrigger("Attack");
            }

            if (projectilePrefab != null)
            {
                // Ranged attack - Spawn Projectile
                Vector3 spawnPos = projectileSpawnPoint != null ? projectileSpawnPoint.position : transform.position + Vector3.up * 1f;
                GameObject projObj = Instantiate(projectilePrefab, spawnPos, Quaternion.identity);
                Projectile projectile = projObj.GetComponent<Projectile>();
                if (projectile != null)
                {
                    projectile.Launch(currentTarget, controller.Stats.Damage);
                }
            }
            else
            {
                // Melee attack - immediate damage
                target.TakeDamage(controller.Stats.Damage);
                Debug.Log($"[{gameObject.name}] executed MELEE attack on [{currentTarget.gameObject.name}] for {controller.Stats.Damage} damage.");
            }
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(transform.position, detectionRadius);
        }
    }
}
