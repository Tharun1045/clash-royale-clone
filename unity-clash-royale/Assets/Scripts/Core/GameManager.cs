using ClashClone.Towers;
using ClashClone.Units;
using System;
using UnityEngine;

namespace ClashClone.Core
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public enum MatchState { Intro, Active, SuddenDeath, GameOverResult }

        [Header("Match Settings")]
        [SerializeField] private float matchDuration = 180f; // 3 minutes in seconds
        private float currentTimer;
        private MatchState state = MatchState.Intro;

        private int playerCrowns = 0;
        private int enemyCrowns = 0;

        // Events for UI bindings
        public event Action<float> OnTimerUpdated; // (remainingTimeSeconds)
        public event Action<int, int> OnCrownsUpdated; // (playerCrowns, enemyCrowns)
        public event Action<MatchState> OnStateChanged; // (newState)
        public event Action<string> OnMatchFinished; // (winnerName)

        public MatchState State => state;
        public int PlayerCrowns => playerCrowns;
        public int EnemyCrowns => enemyCrowns;

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

            currentTimer = matchDuration;
        }

        private void Start()
        {
            TowerController.OnTowerDestroyed += HandleTowerDestroyed;
            SetState(MatchState.Active);
        }

        private void OnDestroy()
        {
            TowerController.OnTowerDestroyed -= HandleTowerDestroyed;
        }

        private void Update()
        {
            if (state != MatchState.Active && state != MatchState.SuddenDeath) return;

            currentTimer -= Time.deltaTime;
            OnTimerUpdated?.Invoke(Mathf.Max(0f, currentTimer));

            if (currentTimer <= 0f)
            {
                if (state == MatchState.Active)
                {
                    EvaluateMatchTimerExpired();
                }
                else
                {
                    // Sudden death time limit expired, resolve tie-breaker
                    EndMatch(playerCrowns >= enemyCrowns ? "Player" : "Enemy");
                }
            }
        }

        private void HandleTowerDestroyed(TowerController tower)
        {
            if (state == MatchState.GameOverResult) return;

            // Increment crowns based on team
            if (tower.Team == UnitController.TeamType.Red)
            {
                playerCrowns++;
                Debug.Log($"GameManager: Player earned a crown! Total Player crowns: {playerCrowns}");
            }
            else
            {
                enemyCrowns++;
                Debug.Log($"GameManager: Enemy earned a crown! Total Enemy crowns: {enemyCrowns}");
            }

            OnCrownsUpdated?.Invoke(playerCrowns, enemyCrowns);

            // If a King Tower is destroyed, game ends immediately
            if (tower.Type == TowerController.TowerType.King)
            {
                string winnerName = tower.Team == UnitController.TeamType.Red ? "Player" : "Enemy";
                EndMatch(winnerName);
                return;
            }

            // In Sudden Death, the first crown wins instantly
            if (state == MatchState.SuddenDeath)
            {
                string winnerName = (tower.Team == UnitController.TeamType.Red) ? "Player" : "Enemy";
                EndMatch(winnerName);
            }
        }

        private void EvaluateMatchTimerExpired()
        {
            if (playerCrowns > enemyCrowns)
            {
                EndMatch("Player");
            }
            else if (enemyCrowns > playerCrowns)
            {
                EndMatch("Enemy");
            }
            else
            {
                TriggerSuddenDeath();
            }
        }

        private void TriggerSuddenDeath()
        {
            SetState(MatchState.SuddenDeath);
            currentTimer = 60f; // 1 minute Sudden Death timer
            
            // Double elixir speed multiplier
            if (ElixirManager.Instance != null)
            {
                ElixirManager.Instance.SetRegenMultiplier(2f);
            }

            Debug.Log("GameManager: Sudden Death Triggered! Double Elixir speed active. First crown wins!");
        }

        private void EndMatch(string winner)
        {
            SetState(MatchState.GameOverResult);
            OnMatchFinished?.Invoke(winner);
            Debug.Log($"GameManager: Match Finished! Winner: {winner}");
        }

        private void SetState(MatchState newState)
        {
            state = newState;
            OnStateChanged?.Invoke(state);
        }
    }
}
