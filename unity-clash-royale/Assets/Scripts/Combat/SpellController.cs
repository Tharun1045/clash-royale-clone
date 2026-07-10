using ClashClone.Utilities;
using ClashClone.Units;
using System.Collections;
using UnityEngine;

namespace ClashClone.Combat
{
    public class SpellController : MonoBehaviour
    {
        [Header("Spell configurations")]
        [SerializeField] private float travelDuration = 1.2f;
        [SerializeField] private float damageRadius = 3.5f;
        [SerializeField] private float arcPeakHeight = 5.0f;
        [SerializeField] private GameObject explosionVfxPrefab;

        private Vector3 startPosition;
        private Vector3 destinationPosition;
        private float spellDamage;
        private UnitController.TeamType castTeam;
        private bool isFlying;
        private float timer;

        public void Cast(Vector3 targetPoint, float damageAmount, UnitController.TeamType team)
        {
            destinationPosition = targetPoint;
            spellDamage = damageAmount;
            castTeam = team;
            
            // Set launch start point near king tower coordinates
            startPosition = team == UnitController.TeamType.Blue ? new Vector3(0f, 0f, -12f) : new Vector3(0f, 0f, 12f);
            transform.position = startPosition;
            
            timer = 0f;
            isFlying = true;
        }

        private void Update()
        {
            if (!isFlying) return;

            timer += Time.deltaTime;
            float t = timer / travelDuration;
            t = Mathf.Min(1.0f, t);

            // Travel along straight path line
            Vector3 lerpedPos = Vector3.Lerp(startPosition, destinationPosition, t);
            
            // Parabolic fly height curve
            float heightOffset = Mathf.Sin(t * Mathf.PI) * arcPeakHeight;
            transform.position = new Vector3(lerpedPos.x, lerpedPos.y + heightOffset, lerpedPos.z);

            if (t >= 1.0f)
            {
                Explode();
            }
        }

        private void Explode()
        {
            isFlying = false;

            // screenshake camera hook
            if (CameraShake.Instance != null)
            {
                CameraShake.Instance.TriggerShake(0.35f, 0.6f);
            }

            // VFX Particle hook
            if (explosionVfxPrefab != null)
            {
                Instantiate(explosionVfxPrefab, destinationPosition, Quaternion.identity);
            }

            // Damage area units
            Collider[] hits = Physics.OverlapSphere(destinationPosition, damageRadius);
            foreach (var hit in hits)
            {
                // Check units
                UnitController unit = hit.GetComponent<UnitController>();
                if (unit != null && unit.Team != castTeam && !unit.Health.IsDead)
                {
                    unit.Health.TakeDamage(spellDamage);
                }

                // Check towers
                IDamageable damageable = hit.GetComponent<IDamageable>();
                if (damageable != null && !damageable.IsDead)
                {
                    // Check tower component
                    Towers.TowerController tower = hit.GetComponent<Towers.TowerController>();
                    if (tower != null && tower.Team != castTeam)
                    {
                        // Spells deal reduced damage to towers in Clash Royale style (e.g., 35% damage)
                        float reducedDamage = spellDamage * 0.35f;
                        damageable.TakeDamage(reducedDamage);
                    }
                }
            }

            Destroy(gameObject);
        }

        private void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.magenta;
            Gizmos.DrawWireSphere(transform.position, damageRadius);
        }
    }
}
