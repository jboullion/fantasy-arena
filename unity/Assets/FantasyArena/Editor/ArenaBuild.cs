using System;
using System.IO;
using FantasyArena.Core;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace FantasyArena.Editor
{
    public static class ArenaBuild
    {
        [MenuItem("Fantasy Arena/Create foundation scene")]
        public static void CreateScene()
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var root = new GameObject("Fantasy Arena");
            var session = root.AddComponent<ArenaSession>();
            var view = root.AddComponent<ArenaView>(); view.Session = session;
            var hud = root.AddComponent<ArenaHud>(); hud.Session = session; hud.View = view;
            root.AddComponent<ArenaSmoke>();
            var camera = new GameObject("Main Camera", typeof(Camera), typeof(AudioListener)); camera.tag = "MainCamera";
            camera.transform.position = new Vector3(0,19,-16); camera.transform.LookAt(Vector3.zero);
            camera.GetComponent<Camera>().backgroundColor = new Color(.1f,.16f,.19f);
            camera.GetComponent<Camera>().fieldOfView = 48;
            var light = new GameObject("Sun", typeof(Light)); light.GetComponent<Light>().type = LightType.Directional;
            light.GetComponent<Light>().intensity = 2; light.transform.rotation = Quaternion.Euler(45,-35,0);
            RenderSettings.ambientLight = new Color(.45f,.5f,.55f);
            var material = new Material(Shader.Find("Universal Render Pipeline/Lit")); material.color = new Color(.16f,.24f,.12f);
            var existing = AssetDatabase.LoadAssetAtPath<Material>("Assets/FantasyArena/Ground.mat");
            if (existing == null) AssetDatabase.CreateAsset(material, "Assets/FantasyArena/Ground.mat");
            else { UnityEngine.Object.DestroyImmediate(material); material = existing; }
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube); ground.name = "64 x 56 arena";
            ground.transform.position = new Vector3(0,-.25f,0); ground.transform.localScale = new Vector3(64,.5f,56); ground.GetComponent<Renderer>().sharedMaterial = material;
            Directory.CreateDirectory("Assets/FantasyArena/Scenes");
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(), "Assets/FantasyArena/Scenes/Foundation.unity");
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene("Assets/FantasyArena/Scenes/Foundation.unity", true) };
            PlayerSettings.companyName = "Fantasy Arena"; PlayerSettings.productName = "Fantasy Arena - Unity Foundation";
            PlayerSettings.defaultScreenWidth = 1440; PlayerSettings.defaultScreenHeight = 900; PlayerSettings.fullScreenMode = FullScreenMode.Windowed;
            PlayerSettings.runInBackground = true;
            AssetDatabase.SaveAssets();
        }
        public static void ValidateAndBuild()
        {
            ValidateCore(); ArenaParity.Validate(); CreateScene();
            var warrior = Resources.Load<GameObject>("Models/warrior"); var goblin = Resources.Load<GameObject>("Models/goblin");
            if (warrior == null || goblin == null) throw new Exception("Model import failed");
            Directory.CreateDirectory("Builds/Windows");
            var report = BuildPipeline.BuildPlayer(EditorBuildSettings.scenes, "Builds/Windows/FantasyArena.exe", BuildTarget.StandaloneWindows64, BuildOptions.Development);
            if (report.summary.result != BuildResult.Succeeded) throw new Exception("Windows build failed: " + report.summary.result);
            Debug.Log("ARENA_BUILD_PASS " + report.summary.totalSize);
        }
        public static void ValidateCore()
        {
            var s = new ArenaSimulation(); s.AddPlayer(0); s.Start(); s.SetInput(0,1,1);
            for (int i=0;i<60;i++) s.Tick();
            if (Math.Abs(Math.Sqrt(s.State.players[0].x*s.State.players[0].x+s.State.players[0].z*s.State.players[0].z)-7)> .02) throw new Exception("Diagonal movement is not normalized");
            s.SetInput(0, float.NaN, 0); s.Tick();
            if (float.IsNaN(s.State.players[0].x)) throw new Exception("Non-finite input accepted");
            var a = new ArenaSimulation(); var b = new ArenaSimulation(); a.AddPlayer(0); b.AddPlayer(0); a.Start(); b.Start();
            a.State.runId = b.State.runId = "determinism-check";
            for(int i=0;i<3600;i++) { a.Tick(); b.Tick(); }
            if(JsonUtility.ToJson(a.State)!=JsonUtility.ToJson(b.State)) throw new Exception("Seeded scenario diverged");
            if(a.State.stage=="playing") throw new Exception("Round failed to end");
            var c = new ArenaSimulation(); for(int i=0;i<5;i++) c.AddPlayer(i);
            if(c.State.players.Count!=4) throw new Exception("Player limit failed");
            Debug.Log("ARENA_CORE_TESTS_PASS");
        }
    }
}
