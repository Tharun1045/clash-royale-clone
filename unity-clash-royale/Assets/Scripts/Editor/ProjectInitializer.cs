#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace ClashClone.Editor
{
    public static class ProjectInitializer
    {
        [MenuItem("Clash Clone/Initialize Project Structure & Scenes")]
        public static void InitializeProject()
        {
            Debug.Log("Clash Clone: Starting project folder initialization...");

            // List of directories to create
            string[] directories = new string[]
            {
                "Assets/Art",
                "Assets/Audio",
                "Assets/Animations",
                "Assets/Materials",
                "Assets/Prefabs",
                "Assets/Scenes",
                "Assets/ScriptableObjects",
                "Assets/Scripts/Cards",
                "Assets/Scripts/Combat",
                "Assets/Scripts/Core",
                "Assets/Scripts/Units",
                "Assets/Scripts/Towers",
                "Assets/Scripts/UI",
                "Assets/Scripts/AI",
                "Assets/Scripts/Networking",
                "Assets/Scripts/Utilities",
                "Assets/Scripts/Editor"
            };

            // Create directories
            foreach (string dir in directories)
            {
                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                    Debug.Log($"Created folder: {dir}");
                }
            }

            // Create template scenes
            CreateSceneTemplate("Assets/Scenes/MainMenu.unity", "Main Menu Scene Setup");
            CreateSceneTemplate("Assets/Scenes/BattleArena.unity", "Battle Arena Scene Setup");

            AssetDatabase.Refresh();
            Debug.Log("Clash Clone: Project folder structure and scene templates successfully initialized!");
            EditorUtility.DisplayDialog("Success", "Project folder structure and Scenes successfully initialized!", "OK");
        }

        private static void CreateSceneTemplate(string scenePath, string name)
        {
            if (File.Exists(scenePath))
            {
                Debug.Log($"Scene already exists: {scenePath}");
                return;
            }

            // Create a new empty scene setup
            Scene newScene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
            
            // Add a simple container object to identify the scene
            GameObject infoObj = new GameObject($"[{name}]");
            infoObj.transform.position = Vector3.zero;

            // Save the scene at the specified path
            EditorSceneManager.SaveScene(newScene, scenePath);
            Debug.Log($"Saved scene template: {scenePath}");
        }
    }
}
#endif
