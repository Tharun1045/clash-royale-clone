using ClashClone.Cards;
using ClashClone.Core;
using ClashClone.Units;
using System.Collections.Generic;
using UnityEngine;

namespace ClashClone.AI
{
    public class EnemyAI : MonoBehaviour
    {
        [Header("AI Deck & Setup")]
        [SerializeField] private List<CardData> deck = new List<CardData>(8);
        [SerializeField] private float elixirRegenRate = 0.85f; // Slightly slower than player by default
        [SerializeField] private float decisionFrequency = 3.0f; // Seconds between actions

        private float currentElixir = 4f;
        private float lastDecisionTime;
        private float maxElixir = 10f;
        private System.Random random = new System.Random();

        public float CurrentElixir => currentElixir;

        private void Start()
        {
            lastDecisionTime = Time.time;
        }

        private void Update()
        {
            if (GameManager.Instance != null && GameManager.Instance.State == GameManager.MatchState.GameOverResult) return;

            // Regenerate Elixir over time
            float regenSpeed = elixirRegenRate;
            if (GameManager.Instance != null && GameManager.Instance.State == GameManager.MatchState.SuddenDeath)
            {
                regenSpeed *= 2f; // Sudden death double elixir
            }

            currentElixir = Mathf.Min(maxElixir, currentElixir + (regenSpeed * Time.deltaTime));

            // Decision cooldown check
            if (Time.time - lastDecisionTime >= decisionFrequency)
            {
                lastDecisionTime = Time.time;
                MakeDecision();
            }
        }

        private void MakeDecision()
        {
            if (deck == null || deck.Count == 0) return;

            // Pick a random card from the deck
            int cardIndex = random.Next(deck.Count);
            CardData selectedCard = deck[cardIndex];

            // Verify cost
            if (currentElixir >= selectedCard.ElixirCost)
            {
                DeployCard(selectedCard);
            }
        }

        private void DeployCard(CardData card)
        {
            currentElixir -= card.ElixirCost;

            // Select spawn coordinates on Red side (Z between 1 and 10)
            float randomX = UnityEngine.Random.Range(-5f, 5f);
            float randomZ = UnityEngine.Random.Range(2f, 10f);
            Vector3 spawnPosition = new Vector3(randomX, 0f, randomZ);

            if (card.SpawnPrefab != null)
            {
                GameObject spawnedObj = Instantiate(card.SpawnPrefab, spawnPosition, Quaternion.identity);
                spawnedObj.name = $"{card.CardName}_Enemy";

                // Configure generated unit team settings dynamically
                UnitController controller = spawnedObj.GetComponent<UnitController>();
                if (controller != null)
                {
                    // Forces the bot's unit to red team
                    SetTeamSettings(spawnedObj, UnitController.TeamType.Red);
                }
                
                Debug.Log($"EnemyAI: Deployed card {card.CardName} at {spawnPosition}. Cost: {card.ElixirCost}. Remaining Elixir: {currentElixir}");
            }
            else
            {
                // Fallback debug object
                GameObject fallback = GameObject.CreatePrimitive(PrimitiveType.Cube);
                fallback.transform.position = spawnPosition;
                fallback.name = $"[Enemy-Fallback] {card.CardName}";
                SetTeamSettings(fallback, UnitController.TeamType.Red);
                Debug.LogWarning($"EnemyAI: Missing prefab reference for card {card.CardName}, spawned fallback Cube.");
            }
        }

        private void SetTeamSettings(GameObject obj, UnitController.TeamType team)
        {
            // Set properties reflectively or by component search
            UnitController controller = obj.GetComponent<UnitController>();
            if (controller != null)
            {
                var teamField = typeof(UnitController).GetField("team", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                if (teamField != null)
                {
                    teamField.SetValue(controller, team);
                }
            }
        }
    }
}
