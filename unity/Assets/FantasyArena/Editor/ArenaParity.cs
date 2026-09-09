using System;
using System.IO;
using System.Linq;
using FantasyArena.Core;
using UnityEditor;
using UnityEngine;
namespace FantasyArena.Editor
{
    [Serializable] public sealed class CombatCase {public string character,element;public float z,hp,damage,playerHp,enemyX,enemyZ,knockback,enemySpeed,enemyDamage;public int ticks,shots,kills,armor,moveAfter;public bool disableAttack,poison,ice;}
    [Serializable] public sealed class RunCase {public string offer;public bool bought,duplicate;public int gold,round;}
    [Serializable] public sealed class ParityFile {public CombatCase[] cases;public RunCase run;public TerrainItem[] obstacles;}
    public static class ArenaParity
    {
        static void Check(bool condition,string message){if(!condition)throw new Exception("Parity: "+message);}
        [MenuItem("Fantasy Arena/Validate browser parity")]
        public static void Validate()
        {
            var fixture=JsonUtility.FromJson<ParityFile>(File.ReadAllText("Assets/FantasyArena/Editor/Fixtures/browser-parity.json"));
            foreach(var test in fixture.cases)
            {
                var sim=new ArenaSimulation{Spawning=false,GoblinSpeed=test.enemySpeed,GoblinDamage=test.enemyDamage,Knockback=test.knockback};sim.AddPlayer(0);sim.ChooseClass(0,test.character);sim.Start();
                var p=sim.State.players[0];p.weapon=test.element==""?"":test.character+"_"+test.element;
                p.armorLevel=test.armor;p.hp=p.maxHealth=ArenaData.Health(p.character)+25*test.armor;if(test.disableAttack)p.attackTimer=999;
                var e=sim.AddEnemy("goblin",0,test.z);e.hp=e.maxHealth=500;
                if(test.poison)e.poisoned=5;if(test.ice)e.chilled=5;
                for(int i=0;i<test.ticks;i++){if(test.moveAfter>=0&&i>=test.moveAfter)sim.SetInput(0,1,0);sim.Tick();}
                Check(Math.Abs(e.hp-test.hp)<.02f&&Math.Abs(p.totalDamage-test.damage)<.02f&&p.kills==test.kills&&sim.State.projectiles.Count==test.shots,
                    $"{test.character}/{test.element}: hp {e.hp}/{test.hp}, damage {p.totalDamage}/{test.damage}, shots {sim.State.projectiles.Count}/{test.shots}");
                Check(Math.Abs(p.hp-test.playerHp)<.02f&&ArenaSimulation.Distance(e.x-test.enemyX,e.z-test.enemyZ)<.03f,$"movement/contact {test.character}: player HP {p.hp}/{test.playerHp}, enemy {e.x},{e.z}/{test.enemyX},{test.enemyZ}");
            }
            var terrain=new ArenaTerrain();Check(terrain.Obstacles.Count==fixture.obstacles.Length,"obstacle count");
            for(int i=0;i<fixture.obstacles.Length;i++)Check(ArenaSimulation.Distance(terrain.Obstacles[i].x-fixture.obstacles[i].x,terrain.Obstacles[i].z-fixture.obstacles[i].z)<.001f&&terrain.Obstacles[i].model==fixture.obstacles[i].model,"terrain placement "+i);
            var run=new ArenaSimulation{Spawning=false};run.AddPlayer(0);run.Start();run.Finish(true);
            var player=run.State.players[0];Check(player.offers[0]==fixture.run.offer,"rotating offer");
            Check(run.Buy(0,player.offers[0])==fixture.run.bought,"purchase");Check(run.Buy(0,player.offers[1])==fixture.run.duplicate,"one weapon per visit");Check(player.gold==fixture.run.gold,"gold");
            run.Finish(true);Check(player.gold==20,"reward settled twice");run.Start();run.Finish(false);run.Start();Check(run.State.round==fixture.run.round&&player.gold==20&&player.weapon==fixture.run.offer,"retry preserves loadout");
            for(int round=2;round<=6;round++){run.Finish(true);if(round<6)run.Start();}
            Check(run.State.stage=="victory"&&run.State.roundsCompleted==6&&player.gold==520,"six-round completion");
            Check(!run.Buy(0,"armor"),"post-victory buying");
            var boss=new ArenaSimulation{Spawning=false};boss.AddPlayer(0);boss.Start();boss.State.round=3;boss.AddEnemy("boss",20,20);boss.State.tick=3599;boss.Tick();Check(boss.State.stage=="playing","boss must die after timer");
            boss.State.enemies.Clear();boss.Tick();Check(boss.State.stage=="shop","boss completion");
            var boundary=new ArenaSimulation{Spawning=false};boundary.AddPlayer(0);boundary.Start();var obstacle=boundary.Terrain.Obstacles[0];var actor=boundary.State.players[0];actor.x=obstacle.x;actor.z=obstacle.z;boundary.Bound(actor);Check(ArenaSimulation.Distance(actor.x-obstacle.x,actor.z-obstacle.z)>=obstacle.radius+.499f,"solid terrain");
            ValidateArchive(run.State);
            Debug.Log($"ARENA_PARITY_PASS {fixture.cases.Length} browser combat cases; terrain, run, boss, collision and archive checks");
        }
        static void ValidateArchive(World world)
        {
            ArenaArchive.DirectoryOverride=Path.GetFullPath("Temp/ArchiveTest-"+Guid.NewGuid().ToString("N"));
            try
            {
                ArenaArchive.Save(world);ArenaArchive.Save(world);var data=ArenaArchive.Load();Check(data.runs.Count==1&&data.runs[0].roundsCompleted==6,"archive upsert");
                Check(File.Exists(ArenaArchive.PathName+".backup"),"atomic backup");
                for(int i=0;i<22;i++){world.runId="test-"+i;ArenaArchive.Save(world);}Check(ArenaArchive.Load().runs.Count==20,"archive retention");
            }
            finally{ArenaArchive.DirectoryOverride=null;}
        }
    }
}
