using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace ClashClone.UI
{
    public class MainMenuController : MonoBehaviour
    {
        [Header("Menu UI Panels")]
        [SerializeField] private GameObject menuPanel;
        [SerializeField] private GameObject deckEditorPanel;
        [SerializeField] private Button playButton;
        [SerializeField] private Button openDeckButton;
        [SerializeField] private Dropdown difficultyDropdown;

        [Header("Scene Config")]
        [SerializeField] private string battleSceneName = "BattleArena";

        // Global difficulty configuration accessible by Bot scripts
        public static string SelectedDifficulty { get; private set; } = "Medium";

        private void Start()
        {
            if (playButton != null) playButton.onClick.AddListener(StartBattle);
            if (openDeckButton != null) openDeckButton.onClick.AddListener(OpenDeckEditor);
            if (difficultyDropdown != null) difficultyDropdown.onValueChanged.AddListener(HandleDifficultyChanged);

            // Hide deck panel initially
            if (deckEditorPanel != null) deckEditorPanel.SetActive(false);
            if (menuPanel != null) menuPanel.SetActive(true);

            // Initialize default difficulty
            if (difficultyDropdown != null)
            {
                HandleDifficultyChanged(difficultyDropdown.value);
            }
        }

        private void StartBattle()
        {
            Debug.Log($"MainMenuController: Starting battle on difficulty [{SelectedDifficulty}]...");
            SceneManager.LoadScene(battleSceneName);
        }

        private void OpenDeckEditor()
        {
            if (deckEditorPanel != null)
            {
                deckEditorPanel.SetActive(true);
                menuPanel.SetActive(false);
            }
        }

        public void CloseDeckEditor()
        {
            if (deckEditorPanel != null)
            {
                deckEditorPanel.SetActive(false);
                menuPanel.SetActive(true);
            }
        }

        private void HandleDifficultyChanged(int index)
        {
            if (difficultyDropdown == null) return;

            SelectedDifficulty = difficultyDropdown.options[index].text;
            PlayerPrefs.SetString("AIDifficulty", SelectedDifficulty);
            PlayerPrefs.Save();
            Debug.Log($"MainMenuController: Difficulty setting updated to: {SelectedDifficulty}");
        }
    }
}
