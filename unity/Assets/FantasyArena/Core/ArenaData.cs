using System;
using System.Collections.Generic;
namespace FantasyArena.Core
{
    [Serializable] public sealed class DamageEntry { public string id; public float damage; }
    [Serializable] public sealed class SpecialAction
    {
        public string mode="idle";
        public float remaining,cooldown,x,z,facing,pulse;
        public List<int> hitIds=new List<int>();
    }
    [Serializable] public sealed class Actor
    {
        public int id,kills,armorLevel,gold,targetId=-1,attackTargetId=-1,burnOwner;
        public string character="warrior",enemyType="",weapon="",burnWeapon="";
        public float x,z,hp=100,maxHealth=100,attackTimer,facingX,facingZ=1;
        public float facing,flash,vx,vz,windup,swing,poisoned,chilled,burnRemaining,burnTick,totalDamage,damageTaken;
        public bool purchasedWeapon,ready;
        public List<string> offers=new List<string>();
        public List<DamageEntry> damageByWeapon=new List<DamageEntry>(),damageByType=new List<DamageEntry>();
        public SpecialAction ai;
    }
    [Serializable] public sealed class Shot
    {
        public int id,ownerId,targetId;
        public string kind,weapon,element;
        public float x,z,facing,speed,damage,life;
    }
    [Serializable] public sealed class World
    {
        public int protocol=2,tick,round=1,roundsCompleted,revision;
        public float elapsed;
        public string stage="lobby",runId="";
        public List<Actor> players=new List<Actor>(),enemies=new List<Actor>();
        public List<Shot> projectiles=new List<Shot>();
    }
    public static class ArenaData
    {
        public static readonly string[] Classes={"warrior","guardian","archer","mage"},Elements={"fire","lightning","ice","poison"},EnemyTypes={"goblin","runner","brute","revenant","boss"};
        public static bool ValidClass(string id)=>Array.IndexOf(Classes,id)>=0;
        public static bool Ranged(string id)=>id=="archer"||id=="mage";
        public static float Health(string id)=>id=="guardian"?140:100;
        public static float Speed(string id)=>id=="guardian"?5.8f:7;
        public static float Damage(string id)=>id=="guardian"?35:25;
        public static float Cooldown(string id)=>id=="guardian"?1.05f:.85f;
        public static string BaseWeapon(string id)=>id=="guardian"?"weapon.axe":id=="archer"?"weapon.bow":id=="mage"?"weapon.staff":"weapon.longsword";
        public static string Element(string weapon){int i=weapon.IndexOf('_');return i<0?"":weapon.Substring(i+1);}
        public static float EnemyHealth(string t)=>t=="runner"?35:t=="brute"?120:t=="revenant"?85:t=="boss"?650:50;
        public static float EnemySpeed(string t)=>t=="runner"?4.3f:t=="brute"?2:t=="revenant"?3.5f:t=="boss"?2.1f:2.8f;
        public static float EnemyDamage(string t)=>t=="runner"?8:t=="brute"?18:t=="revenant"?15:t=="boss"?25:10;
        public static float Scale(string t)=>t=="runner"?.8f:t=="brute"?1.35f:t=="revenant"?1.1f:t=="boss"?2.3f:1;
        public static int Unlock(string t)=>t=="runner"?2:t=="brute"?4:t=="revenant"?6:t=="boss"?3:1;
        public static void Credit(List<DamageEntry> entries,string id,float amount)
        {var e=entries.Find(x=>x.id==id);if(e==null){e=new DamageEntry{id=id};entries.Add(e);}e.damage+=amount;}
    }
}
