using ClashClone.Core;
using System;
using UnityEngine;
using UnityEngine.UI;

namespace ClashClone.UI
{
    public class BattleHUD : MonoBehaviour
    {
        [Header("Elixir Displays")]
        [SerializeField] private Slider elixirSlider;
        [SerializeField] private Text elixirValueText;

        [Header("Match Indicators")]
        [SerializeField] private Text timerLabel;
        [SerializeField] private Text crownScoreLabel;
        [SerializeField] private GameObject suddenDeathPanel;

        [Header("GameOver Screens")]
        [SerializeField] private GameObject gameOverPanel;
        [SerializeField] private Text winnerLabel;
        [SerializeField] private Text gameOverMessage;

        private void Start()
        {
            // Subscribe to game systems events
            if (ElixirManager.Instance != null)
            {
                ElixirManager.Instance.OnElixirChanged += HandleElixirChanged;
                // Initialize Elixir view
                HandleElixirChanged(ElixirManager.Instance.CurrentElixir);
            }

            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnTimerUpdated += HandleTimerUpdated;
                GameManager.Instance.OnCrownsUpdated += HandleCrownsUpdated;
                GameManager.Instance.OnStateChanged += HandleMatchStateChanged;
                GameManager.Instance.OnMatchFinished += HandleMatchFinished;

                // Initialize crowns score view
                HandleCrownsUpdated(GameManager.Instance.PlayerCrowns, GameManager.Instance.EnemyCrowns);
            }

            // Hide overlays initially
            if (suddenDeathPanel != null) suddenDeathPanel.SetActive(false);
            if (gameOverPanel != null) gameOverPanel.SetActive(false);
        }

        private void OnDestroy()
        {
            if (ElixirManager.Instance != null)
            {
                ElixirManager.Instance.OnElixirChanged -= HandleElixirChanged;
            }

            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnTimerUpdated -= HandleTimerUpdated;
                GameManager.Instance.OnCrownsUpdated -= HandleCrownsUpdated;
                GameManager.Instance.OnStateChanged -= HandleMatchStateChanged;
                GameManager.Instance.OnMatchFinished -= HandleMatchFinished;
            }
        }

        private void HandleElixirChanged(float elixir)
        {
            if (elixirSlider != null)
            {
                // Elixir ranges from 0 to 10
                elixirSlider.value = elixir / 10f;
            }

            if (elixirValueText != null)
            {
                elixirValueText.text = Mathf.FloorToInt(elixir).ToString();
            }
        }

        private void HandleTimerUpdated(float remainingTime)
        {
            if (timerLabel == null) return;

            int minutes = Mathf.FloorToInt(remainingTime / 60f);
            int seconds = Mathf.FloorToInt(remainingTime % 60f);
            timerLabel.text = string.Format("{0}:{1:00}", minutes, seconds);
        }

        private void HandleCrownsUpdated(int player, int enemy)
        {
            if (crownScoreLabel != null)
            {
                crownScoreLabel.text = $"{player} - {enemy}";
            }
        }

        private void HandleMatchStateChanged(GameManager.MatchState state)
        {
            if (state == GameManager.MatchState.SuddenDeath)
            {
                if (suddenDeathPanel != null)
                {
                    suddenDeathPanel.SetActive(true);
                }
            }
        }

        private void HandleMatchFinished(string winner)
        {
            if (gameOverPanel == null) return;

            gameOverPanel.SetActive(true);

            if (winnerLabel != null)
            {
                winnerLabel.text = winner.ToUpper() + " WINS!";
            }

            if (gameOverMessage != null)
            {
                if (winner.Equals("Player", StringComparison.OrdinalIgnoreCase))
                {
                    gameOverMessage.text = "Victory! You defeated the Robot AI.";
                }
                else
                {
                    gameOverMessage.text = "Defeat! The Robot AI outsmarted you.";
                }
            }
        }

        // Restart Scene button action hook
        public void RestartBattle()
        {
            // Reloads active scene
            UnityEngine.SceneManagement.SceneManager.LoadScene(
                UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex
            );
        }
    }
}
