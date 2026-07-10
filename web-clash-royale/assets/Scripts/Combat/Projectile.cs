using UnityEngine;

namespace ClashClone.Combat
{
    public class Projectile : MonoBehaviour
    {
        [Header("Projectile settings")]
        [SerializeField] private float speed = 12f;
        [SerializeField] private float arcHeight = 2.5f;
        [SerializeField] private GameObject hitEffectPrefab;

        private Transform target;
        private Vector3 startPosition;
        private Vector3 lastTargetPos;
        private float damage;
        private float travelProgress;
        private float flightDistance;
        private bool isLaunched;

        public void Launch(Transform targetTransform, float damageValue)
        {
            target = targetTransform;
            damage = damageValue;
            startPosition = transform.position;
            lastTargetPos = target != null ? target.position : startPosition + transform.forward * 5f;
            
            flightDistance = Vector3.Distance(startPosition, lastTargetPos);
            travelProgress = 0f;
            isLaunched = true;
        }

        private void Update()
        {
            if (!isLaunched) return;

            // Track target movement if still alive
            if (target != null)
            {
                lastTargetPos = target.position;
            }

            // Calculate flight progress based on distance
            float distanceToTravel = Vector3.Distance(startPosition, lastTargetPos);
            if (distanceToTravel > 0)
            {
                travelProgress += (speed * Time.deltaTime) / distanceToTravel;
            }
            else
            {
                travelProgress = 1.0f;
            }

            travelProgress = Mathf.Min(1.0f, travelProgress);

            // Interpolate position
            Vector3 currentLerpPos = Vector3.Lerp(startPosition, lastTargetPos, travelProgress);
            
            // Apply parabolic arc height offset
            float heightOffset = Mathf.Sin(travelProgress * Mathf.PI) * arcHeight;
            transform.position = new Vector3(currentLerpPos.x, currentLerpPos.y + heightOffset, currentLerpPos.z);

            // Rotate towards direction of travel
            Vector3 direction = (lastTargetPos - transform.position).normalized;
            if (direction != Vector3.zero)
            {
                transform.rotation = Quaternion.LookRotation(direction);
            }

            // Check impact
            if (travelProgress >= 1.0f)
            {
                Impact();
            }
        }

        private void Impact()
        {
            isLaunched = false;

            // Apply Damage
            if (target != null)
            {
                IDamageable targetHealth = target.GetComponent<IDamageable>();
                if (targetHealth != null)
                {
                    targetHealth.TakeDamage(damage);
                }
            }

            // Spawn hit particle effect
            if (hitEffectPrefab != null)
            {
                Instantiate(hitEffectPrefab, transform.position, Quaternion.identity);
            }

            Destroy(gameObject);
        }
    }
}
