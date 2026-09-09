using System;
using System.Collections.Generic;
using System.Linq;
namespace FantasyArena.Core
{
    public sealed partial class ArenaSimulation
    {
        public const float Step=1f/60;
        public World State=new World();
        public readonly ArenaTerrain Terrain=new ArenaTerrain();
        public bool Spawning=true,TerrainCollision=true;
        public float Knockback=7,GoblinDamage=10,GoblinSpeed=2.8f;
        readonly Dictionary<int,(float x,float z)> inputs=new Dictionary<int,(float,float)>();
        uint seed=42;
        int nextEnemy=1;
        float spawnTimer;
        bool settled;
        public static float Distance(float x,float z)=>(float)Math.Sqrt(x*x+z*z);
        float Random(){seed=unchecked(seed*1664525+1013904223);return (float)(seed/4294967296.0);}
        public void AddPlayer(int id)
        {
            if(State.stage!="lobby"||State.players.Count>=4||State.players.Exists(p=>p.id==id))return;
            State.players.Add(new Actor{id=id,x=State.players.Count*2});
        }
        public bool ChooseClass(int id,string character)
        {
            var p=State.players.Find(a=>a.id==id);if(State.stage!="lobby"||p==null||!ArenaData.ValidClass(character))return false;
            p.character=character;p.hp=p.maxHealth=ArenaData.Health(character);p.ready=false;return true;
        }
        public void SetInput(int id,float x,float z)
        {
            if(float.IsNaN(x)||float.IsInfinity(x)||float.IsNaN(z)||float.IsInfinity(z))return;
            x=Math.Clamp(x,-1,1);z=Math.Clamp(z,-1,1);float d=Math.Max(1,Distance(x,z));inputs[id]=(x/d,z/d);
        }
        public void Start()
        {
            if(State.players.Count==0||State.stage=="playing"||State.stage=="victory")return;
            if(State.stage=="lobby")
            {
                State.runId=Guid.NewGuid().ToString("N");State.round=1;State.roundsCompleted=0;
                foreach(var p in State.players){p.gold=p.armorLevel=p.kills=0;p.weapon="";p.totalDamage=p.damageTaken=0;p.damageByType.Clear();p.damageByWeapon.Clear();}
            }
            else if(State.stage=="shop")State.round++;
            ResetRound();
        }
        public void ResetRound()
        {
            State.elapsed=0;State.tick=0;State.stage="playing";State.enemies.Clear();State.projectiles.Clear();
            settled=false;seed=42;nextEnemy=1;spawnTimer=0;inputs.Clear();
            for(int i=0;i<State.players.Count;i++)
            {
                var p=State.players[i];p.hp=p.maxHealth=ArenaData.Health(p.character)+p.armorLevel*25;
                p.x=State.players.Count==1?0:(i%2==0?-1.5f:1.5f);p.z=State.players.Count==1?0:(i<2?-1.5f:1.5f);
                Facing(p,(float)Math.PI);p.flash=p.vx=p.vz=p.attackTimer=p.windup=p.swing=p.chilled=0;p.targetId=-1;
            }
            if(Spawning)
            {
                SpawnPack();spawnTimer=Interval(7.5f);
                string introduced=ArenaData.EnemyTypes.FirstOrDefault(t=>t!="boss"&&t!="goblin"&&ArenaData.Unlock(t)==State.round);
                if(introduced!=null)Spawn(introduced);
                if(State.round==3||State.round==6)Spawn("boss");
            }
        }
        public bool Buy(int id,string item)
        {
            var p=State.players.Find(a=>a.id==id);if(State.stage!="shop"||p==null)return false;
            if(item=="armor"){int price=70+p.armorLevel*35;if(p.armorLevel>=5||p.gold<price)return false;p.gold-=price;p.armorLevel++;p.ready=false;return true;}
            if(p.purchasedWeapon||p.gold<80||!p.offers.Contains(item)||p.weapon==item)return false;
            p.gold-=80;p.weapon=item;p.purchasedWeapon=true;p.ready=false;return true;
        }
        public void Finish(bool complete)
        {
            if(settled)return;settled=true;State.revision++;
            foreach(var p in State.players)
            {
                p.purchasedWeapon=false;p.ready=false;p.offers.Clear();if(complete)p.gold+=100;
                if(complete&&State.round<6)
                {
                    int start=((State.round-1)*2)%4;
                    for(int i=0;i<4&&p.offers.Count<2;i++){string item=p.character+"_"+ArenaData.Elements[(start+i)%4];if(item!=p.weapon)p.offers.Add(item);}
                }
            }
            if(complete)State.roundsCompleted=State.round;
            State.stage=!complete?"defeat":State.round==6?"victory":"shop";State.projectiles.Clear();
        }
        float Interval(float count)=>2.4f*count/((1+State.elapsed/60)*(1+(float)Math.Floor(State.elapsed/30)));
        public Actor AddEnemy(string type,float x,float z)
        {
            float hp=ArenaData.EnemyHealth(type);
            if(type=="boss")hp*=(State.round==3?.6f:1.5f)*(1+(State.players.Count-1)*.5f);
            var e=new Actor{id=nextEnemy++,enemyType=type,x=x,z=z,hp=hp,maxHealth=hp,attackTimer=.7f};State.enemies.Add(e);return e;
        }
        void Spawn(string type)
        {
            if(State.enemies.Count>=200)return;float x=0,z=0;
            for(int tries=0;tries<12;tries++){int edge=(int)(Random()*4);x=edge<2?(edge==0?-1:1)*31.4f:(Random()-.5f)*62.8f;z=edge>=2?(edge==2?-1:1)*27.4f:(Random()-.5f)*54.8f;if(State.players.All(p=>p.hp<=0||Distance(x-p.x,z-p.z)>=8))break;}
            if(State.players.Any(p=>p.hp>0&&Distance(x-p.x,z-p.z)<8))return;AddEnemy(type,x,z);
        }
        public int SpawnPack()
        {
            int capacity=200-State.enemies.Count;if(capacity<5)return 0;int count=Math.Min(capacity,5+(int)(Random()*6));
            for(int attempt=0;attempt<24;attempt++)
            {
                int edge=(int)(Random()*4);bool horizontal=edge>=2;float along=(Random()-.5f)*(horizontal?52:44);
                var positions=new List<(float x,float z)>();
                for(int i=0;i<count;i++){float tangent=along+(i%5-2)*1.15f,inward=1.2f+(i/5)*1.15f;positions.Add(horizontal?(tangent,(edge==2?-1:1)*(28-inward)):((edge==0?-1:1)*(32-inward),tangent));}
                if(positions.Any(a=>Math.Abs(a.x)>31.5||Math.Abs(a.z)>27.5||State.players.Any(p=>p.hp>0&&Distance(a.x-p.x,a.z-p.z)<8)||Terrain.Obstacles.Any(o=>Distance(a.x-o.x,a.z-o.z)<o.radius+.5f)||State.enemies.Any(e=>Distance(a.x-e.x,a.z-e.z)<1)))continue;
                foreach(var p in positions)AddEnemy("goblin",p.x,p.z);return count;
            }
            return 0;
        }
        public void Tick()
        {
            if(State.stage!="playing")return;State.tick++;State.elapsed=Math.Min(60,State.tick*Step);
            if(State.elapsed>=60&&!State.enemies.Any(e=>e.enemyType=="boss"&&e.hp>0)){Finish(true);return;}
            spawnTimer-=Step;
            if(Spawning&&spawnTimer<=0&&State.elapsed<60)
            {
                var available=ArenaData.EnemyTypes.Where(t=>t!="boss"&&ArenaData.Unlock(t)<=State.round).ToArray();string type=available[(int)(Random()*available.Length)];
                if(type=="goblin"){int count=SpawnPack();spawnTimer=count>0?Interval(count):.5f;}else{Spawn(type);spawnTimer=Interval(1);}
            }
            Statuses();foreach(var p in State.players)if(p.hp>0)PlayerStep(p);Projectiles();Enemies();
            if(State.players.All(p=>p.hp<=0))Finish(false);
        }
        public void Bound(Actor a)
        {
            float radius=a.enemyType!=""?.5f*ArenaData.Scale(a.enemyType):.5f;
            a.x=Math.Clamp(a.x,-32+radius,32-radius);a.z=Math.Clamp(a.z,-28+radius,28-radius);
            if(!TerrainCollision)return;
            foreach(var o in Terrain.Obstacles){float dx=a.x-o.x,dz=a.z-o.z,d=Distance(dx,dz),r=radius+o.radius;if(d<r){a.x=o.x+(d>.0001f?dx/d:1)*r;a.z=o.z+(d>.0001f?dz/d:0)*r;}}
        }
        void Move(Actor a,float dx,float dz){int steps=Math.Max(1,(int)Math.Ceiling(Distance(dx,dz)/.2f));for(int i=0;i<steps;i++){a.x+=dx/steps;a.z+=dz/steps;Bound(a);}}
        Actor Nearest(List<Actor> list,Actor a)=>list.Where(e=>e.hp>0).OrderBy(e=>(e.x-a.x)*(e.x-a.x)+(e.z-a.z)*(e.z-a.z)).FirstOrDefault();
        static void Facing(Actor a,float angle){a.facing=angle;a.facingX=(float)Math.Sin(angle);a.facingZ=(float)Math.Cos(angle);}
    }
}
