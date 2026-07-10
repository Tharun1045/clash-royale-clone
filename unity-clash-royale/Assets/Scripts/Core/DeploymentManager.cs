using ClashClone.Cards;
using System;
using UnityEngine;

namespace ClashClone.Core
{
    public class DeploymentManager : MonoBehaviour
    {
        public static DeploymentManager Instance { get; private set; }

        [Header("Deployment Boundaries")]
        [Tooltip("The layer representing the ground where units can be spawned.")]
        [SerializeField] private LayerMask groundLayer;
        [SerializeField] private float playerZoneMinX = -8f;
        [SerializeField] private float playerZoneMaxX = 8f;
        [SerializeField] private float playerZoneMinZ = -12f;
        [SerializeField] private float playerZoneMaxZ = -1f; // River is at Z=0

        // Events for feedback loops
        public static event Action<int, GameObject> OnDeploymentSuccess; // (slotIndex, spawnedTroopObject)
        public static event Action<int, string> OnDeploymentFailure;      // (slotIndex, failureReason)

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
                return;
            }
        }

        private void OnEnable()
        {
            CardUIDragHandler.OnCardDropped += HandleCardDropped;
        }

        private void OnDisable()
        {
            CardUIDragHandler.OnCardDropped -= HandleCardDropped;
        }

        private void HandleCardDropped(int slotIndex, Vector2 screenPosition)
        {
            CardData card = CardHandManager.Instance.GetCardInSlot(slotIndex);
            if (card == null)
            {
                OnDeploymentFailure?.Invoke(slotIndex, "Invalid card in slot");
                return;
            }

            // Check Elixir Cost first
            if (!ElixirManager.Instance.CanSpend(card.ElixirCost))
            {
                OnDeploymentFailure?.Invoke(slotIndex, "Insufficient elixir");
                Debug.Log($"DeploymentManager: Insufficient elixir to deploy {card.CardName} (Cost: {card.ElixirCost})");
                return;
            }

            // Raycast into world space to find target point
            Ray ray = Camera.main != null ? Camera.main.ScreenPointToRay(screenPosition) : new Ray(Vector3.zero, Vector3.forward);
            Vector3 spawnPoint;

            if (Physics.Raycast(ray, out RaycastHit hit, 100f, groundLayer))
            {
                spawnPoint = hit.point;
            }
            else
            {
                // Fallback math plane at y = 0
                Plane groundPlane = new Plane(Vector3.up, Vector3.zero);
                if (groundPlane.Raycast(ray, out float enter))
                {
                    spawnPoint = ray.GetPoint(enter);
                }
                else
                {
                    OnDeploymentFailure?.Invoke(slotIndex, "Missed battlefield");
                    return;
                }
            }

            // Validate Spawn Coordinates (Z-boundaries representation)
            if (!IsValidDeploymentZone(spawnPoint))
            {
                OnDeploymentFailure?.Invoke(slotIndex, "Invalid spawn zone");
                Debug.Log($"DeploymentManager: Invalid deployment coordinate {spawnPoint}. Refused spawn.");
                return;
            }

            // Deduct Elixir and Spawn Prefab
            ElixirManager.Instance.SpendElixir(card.ElixirCost);
            
            GameObject spawnedInstance = null;
            if (card.SpawnPrefab != null)
            {
                spawnedInstance = Instantiate(card.SpawnPrefab, spawnPoint, Quaternion.identity);
                spawnedInstance.name = $"{card.CardName}_Player";
            }
            else
            {
                // Fallback block marker if prefab is missing
                spawnedInstance = GameObject.CreatePrimitive(PrimitiveType.Cube);
                spawnedInstance.transform.position = spawnPoint;
                spawnedInstance.name = $"[Placeholder] {card.CardName}";
                Debug.LogWarning($"DeploymentManager: Card {card.CardName} is missing a SpawnPrefab, spawned standard Cube.");
            }

            // Cycle hand slot to bring new card
            CardHandManager.Instance.CycleCardSlot(slotIndex);

            // Fire success
            OnDeploymentSuccess?.Invoke(slotIndex, spawnedInstance);
            Debug.Log($"DeploymentManager: Successfully deployed {card.CardName} at {spawnPoint}. Elixir spent: {card.ElixirCost}");
        }

        private bool IsValidDeploymentZone(Vector3 pos)
        {
            // Simple bound box validation representing the player's side of the river map
            return pos.x >= playerZoneMinX && pos.x <= playerZoneMaxX &&
                   pos.z >= playerZoneMinZ && pos.z <= playerZoneMaxZ;
        }

        // Expand zone when enemy tower is destroyed
        public void AdjustPlayerZoneZMax(float newMaxZ)
        {
            playerZoneMaxZ = newMaxZ;
            Debug.Log($"DeploymentManager: Player deployment boundary expanded to ZMax = {newMaxZ}");
        }
    }
}
