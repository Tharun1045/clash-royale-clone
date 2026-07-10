using System.Collections.Generic;
using UnityEngine;

namespace ClashClone.Units
{
    [RequireComponent(typeof(UnitController))]
    public class UnitMovement : MonoBehaviour
    {
        private UnitController controller;
        private List<Vector3> pathWaypoints = new List<Vector3>();
        private int currentWaypointIndex = 0;
        private Transform activeChasedTarget;

        [Header("Movement Constants")]
        [SerializeField] private float stoppingDistanceMultiplier = 0.9f;

        public bool IsMoving { get; private set; }

        private void Awake()
        {
            controller = GetComponent<UnitController>();
        }

        private void Start()
        {
            GeneratePathWaypoints();
        }

        private void Update()
        {
            Vector3 targetPosition;
            float stopRange = 0.2f;

            // Priority 1: If unit combat component has a target and unit is not a "Towers Only" unit, chase it
            if (controller.Combat != null && controller.Combat.CurrentTarget != null && 
                controller.Stats.TargetPreference != TargetType.TowersOnly)
            {
                activeChasedTarget = controller.Combat.CurrentTarget;
                targetPosition = activeChasedTarget.position;
                stopRange = controller.Stats.AttackRange * stoppingDistanceMultiplier;
            }
            else
            {
                // Priority 2: Walk along pre-calculated lane waypoints
                activeChasedTarget = null;
                if (currentWaypointIndex < pathWaypoints.Count)
                {
                    targetPosition = pathWaypoints[currentWaypointIndex];
                    stopRange = 0.5f;
                }
                else
                {
                    IsMoving = false;
                    return;
                }
            }

            MoveTowards(targetPosition, stopRange);
        }

        private void MoveTowards(Vector3 targetPos, float stopRange)
        {
            Vector3 startPos = transform.position;
            Vector3 diff = targetPos - startPos;
            diff.y = 0; // Lock vertical axis
            
            float distance = diff.magnitude;

            if (distance > stopRange)
            {
                IsMoving = true;
                Vector3 direction = diff.normalized;
                transform.position += direction * controller.Stats.Speed * Time.deltaTime;
                
                if (direction != Vector3.zero)
                {
                    transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction), Time.deltaTime * 10f);
                }
            }
            else
            {
                IsMoving = false;
                // If we reached waypoint (not chasing target), increment waypoint index
                if (activeChasedTarget == null)
                {
                    currentWaypointIndex++;
                }
            }
        }

        private void GeneratePathWaypoints()
        {
            pathWaypoints.Clear();
            bool isLeftLane = transform.position.x < 0;

            if (controller.Team == UnitController.TeamType.Blue)
            {
                // Blue moving up (Z increasing)
                float bridgeX = isLeftLane ? -4f : 4f;
                pathWaypoints.Add(new Vector3(bridgeX, 0f, 0f)); // Waypoint 1: Bridge
                pathWaypoints.Add(new Vector3(bridgeX, 0f, 8f)); // Waypoint 2: Princess Tower
                pathWaypoints.Add(new Vector3(0f, 0f, 12f));     // Waypoint 3: King Tower
            }
            else
            {
                // Red moving down (Z decreasing)
                float bridgeX = isLeftLane ? -4f : 4f;
                pathWaypoints.Add(new Vector3(bridgeX, 0f, 0f)); // Waypoint 1: Bridge
                pathWaypoints.Add(new Vector3(bridgeX, 0f, -8f)); // Waypoint 2: Princess Tower
                pathWaypoints.Add(new Vector3(0f, 0f, -12f));    // Waypoint 3: King Tower
            }
            currentWaypointIndex = 0;
        }

        // Expose waypoints override for custom waypoint setups
        public void SetPath(List<Vector3> customWaypoints)
        {
            pathWaypoints = new List<Vector3>(customWaypoints);
            currentWaypointIndex = 0;
        }
    }
}
