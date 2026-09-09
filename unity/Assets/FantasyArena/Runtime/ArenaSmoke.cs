using System;
using System.IO;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace FantasyArena
{
    // Explicit command-line test mode; ordinary builds never auto-start or auto-quit.
    public sealed class ArenaSmoke : MonoBehaviour
    {
        ArenaSession session;
        string mode, output, screenshot;
        float began;
        int maxPlayers, maxTick;
        bool launched;
        bool captured;
        Gamepad padOne, padTwo;
        Vector2 firstPosition, secondPosition;
        string terminalStage = "";
        bool remoteMoved;
        bool remoteInitialSet;
        Vector2 remoteInitial;
        string preview;
        void Start()
        {
            var args = Environment.GetCommandLineArgs();
            for(int i=0;i<args.Length-1;i++)if(args[i]=="-arenaUiPreview")preview=args[i+1];
            for(int i=0;i<args.Length-1;i++) { if(args[i]=="-arenaSmoke") mode=args[i+1]; if(args[i]=="-arenaReport") output=args[i+1]; if(args[i]=="-arenaScreenshot") screenshot=args[i+1]; }
            if(string.IsNullOrEmpty(mode)) { enabled=false; return; }
            session=GetComponent<ArenaSession>(); session.SaveReports=false; GetComponent<ArenaView>().Automated=true; began=Time.realtimeSinceStartup;
            if(!string.IsNullOrEmpty(preview))
            {
                if(preview!="menu")
                {
                    session.Offline(false);
                    if(preview=="presentation")
                    {
                        session.Launch();session.Simulation.Spawning=false;session.Simulation.State.enemies.Clear();
                        session.Simulation.State.enemies.Add(new FantasyArena.Core.Actor{id=999,enemyType="goblin",x=2,z=0,hp=500});
                    }
                    else if(preview!="lobby") {session.Launch();session.Simulation.Finish(true);session.Simulation.State.stage=preview;}
                }
                return;
            }
            if(mode=="host") session.Connect(true,"127.0.0.1");
            else if(mode=="guest") session.Connect(false,"127.0.0.1");
            else if(mode=="local")
            { session.Offline(true); padOne=InputSystem.AddDevice<Gamepad>(); padTwo=InputSystem.AddDevice<Gamepad>(); }
            else {session.Offline(false); session.Launch(); launched=true;}
        }
        void Update()
        {
            if(session==null)return;
            float elapsed=Time.realtimeSinceStartup-began;
            if(!captured && elapsed>10 && !string.IsNullOrEmpty(screenshot)) { CaptureFrame(); captured=true; }
            if(!string.IsNullOrEmpty(preview))
            {
                if(preview=="presentation")
                {
                    if(elapsed>3)session.Simulation.State.enemies.Clear();
                    if(elapsed>5&&elapsed<5.2f)session.Simulation.State.players[0].flash=.3f;
                    if(elapsed>7){session.Simulation.State.players[0].hp=0;session.Simulation.State.stage="defeat";}
                    if(elapsed>12)
                    {
                        var fx=GetComponent<ArenaView>().Presentation;
                        bool ok=fx.DeathCount>=2&&fx.EffectCount>0;
                        Debug.Log($"ARENA_PRESENTATION pass={ok} corpses={fx.DeathCount} effects={fx.EffectCount} sounds={fx.SoundCount}");
                        Application.Quit(ok?0:1);
                    }
                }
                else if(elapsed>12)Application.Quit();return;
            }
            if(mode=="local")
            {
                InputSystem.QueueStateEvent(padOne, elapsed<1 ? new GamepadState().WithButton(GamepadButton.Start) : new GamepadState {leftStick=new Vector2(.5f,0)});
                InputSystem.QueueStateEvent(padTwo, elapsed>1 && elapsed<2 ? new GamepadState().WithButton(GamepadButton.Start) : new GamepadState {leftStick=new Vector2(-.5f,0)});
                if(!launched && session.World.players.Count==2 && elapsed>2) { session.Launch(); launched=true; }
                if(elapsed>3 && session.World.players.Count==2) { firstPosition=new Vector2(session.World.players[0].x,session.World.players[0].z); secondPosition=new Vector2(session.World.players[1].x,session.World.players[1].z); }
            }
            if((mode=="host"||mode=="guest")&&session.World.stage=="lobby")
            {var own=session.World.players.Find(p=>p.id==session.LocalId);if(own!=null&&!own.ready)session.Command("ready","true");}
            if(mode=="host" && !launched && session.World.players.Count==2 && !session.World.players.Exists(p=>!p.ready)) {session.Launch(); launched=true;}
            maxPlayers=Math.Max(maxPlayers,session.World.players.Count); maxTick=Math.Max(maxTick,session.World.tick);
            if(session.World.stage=="victory" || session.World.stage=="defeat" || session.World.stage=="shop") terminalStage=session.World.stage;
            if(session.World.players.Count>1 && session.World.stage=="playing")
            {
                var remote=session.World.players[1];
                var position=new Vector2(remote.x,remote.z);
                if(!remoteInitialSet){remoteInitial=position;remoteInitialSet=true;}
                if(Vector2.Distance(position,remoteInitial)>.3f)remoteMoved=true;
            }
            if(elapsed<75)return;
            bool pass=maxTick>120 && terminalStage!="" && (mode=="offline" || maxPlayers==2 && remoteMoved) && (mode!="local" || firstPosition.x>1 && secondPosition.x<1);
            string report=$"{{\"mode\":\"{mode}\",\"pass\":{pass.ToString().ToLowerInvariant()},\"maxPlayers\":{maxPlayers},\"maxTick\":{maxTick},\"stage\":\"{terminalStage}\",\"remoteMoved\":{remoteMoved.ToString().ToLowerInvariant()}}}";
            if(!string.IsNullOrEmpty(output)) File.WriteAllText(output,report);
            Debug.Log("ARENA_SMOKE "+report); Application.Quit(pass?0:1); enabled=false;
        }
        void CaptureFrame()
        {
            var camera = Camera.main;
            var target = new RenderTexture(1440,900,24,RenderTextureFormat.ARGB32); target.Create();
            foreach(var canvas in FindObjectsByType<Canvas>(FindObjectsSortMode.None))
            { canvas.renderMode=RenderMode.ScreenSpaceCamera; canvas.worldCamera=camera; canvas.planeDistance=1; }
            Canvas.ForceUpdateCanvases();
            RenderPipeline.SubmitRenderRequest(camera,new UniversalRenderPipeline.SingleCameraRequest { destination=target });
            var previous=RenderTexture.active; RenderTexture.active=target;
            var image=new Texture2D(1440,900,TextureFormat.RGB24,false);
            image.ReadPixels(new Rect(0,0,1440,900),0,0); image.Apply(); File.WriteAllBytes(screenshot,image.EncodeToPNG());
            RenderTexture.active=previous; target.Release(); Destroy(target); Destroy(image);
        }
    }
}
