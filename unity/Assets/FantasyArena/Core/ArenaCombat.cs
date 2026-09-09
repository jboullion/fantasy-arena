using System;
using System.Linq;
namespace FantasyArena.Core
{
    public sealed partial class ArenaSimulation
    {
        void PlayerStep(Actor p)
        {
            p.chilled=Math.Max(0,p.chilled-Step);float speed=ArenaData.Speed(p.character)*(p.chilled>0?.65f:1);
            if(!inputs.TryGetValue(p.id,out var input))input=(0,0);
            p.vx=input.x*speed;p.vz=input.z*speed;Move(p,p.vx*Step,p.vz*Step);
            p.flash=Math.Max(0,p.flash-Step);p.attackTimer-=Step;p.swing=Math.Max(0,p.swing-Step);
            var nearest=Nearest(State.enemies,p);p.targetId=nearest?.id??-1;
            float distance=nearest==null?float.MaxValue:Distance(nearest.x-p.x,nearest.z-p.z);
            bool ranged=ArenaData.Ranged(p.character);float range=ranged?10:2.7f;
            if(p.windup<=0&&p.swing<=0&&nearest!=null)Facing(p,(float)Math.Atan2(nearest.x-p.x,nearest.z-p.z));
            if(p.windup>0)
            {
                p.windup-=Step;if(p.windup>0)return;
                if(ranged)
                {
                    if(nearest!=null&&distance<=range)
                    {
                        Facing(p,(float)Math.Atan2(nearest.x-p.x,nearest.z-p.z));float shotSpeed=p.character=="archer"?18:12;
                        State.projectiles.Add(new Shot{id=nextEnemy++,ownerId=p.id,targetId=nearest.id,kind=p.character=="archer"?"arrow":"magic_missile",x=p.x,z=p.z,facing=p.facing,speed=shotSpeed,damage=ArenaData.Damage(p.character),life=range/shotSpeed+.5f,weapon=Weapon(p),element=ArenaData.Element(p.weapon)});p.swing=.23f;
                    }
                    return;
                }
                p.swing=.23f;
                foreach(var e in State.enemies)
                {
                    float dx=e.x-p.x,dz=e.z-p.z;
                    double angle=Math.Atan2(Math.Sin(Math.Atan2(dx,dz)-p.facing),Math.Cos(Math.Atan2(dx,dz)-p.facing));
                    if(Distance(dx,dz)<=2.7f&&Math.Abs(angle)<=130*Math.PI/360)ElementalHit(p,e,ArenaData.Damage(p.character),p.facing,Weapon(p),ArenaData.Element(p.weapon));
                }
                State.enemies.RemoveAll(e=>e.hp<=0);
            }
            else if(nearest!=null&&distance<=range&&p.attackTimer<=0&&p.swing<=0){p.windup=.12f;p.attackTimer=ArenaData.Cooldown(p.character);}
        }
        static string Weapon(Actor p)=>p.weapon==""?ArenaData.BaseWeapon(p.character):p.weapon;
        void DamageEnemy(Actor p,Actor e,float damage,float facing,string weapon,string element="",bool impact=true,bool elemental=false)
        {
            if(e.hp<=0)return;float dealt=Math.Min(e.hp,damage);p.totalDamage+=dealt;
            ArenaData.Credit(p.damageByWeapon,weapon,dealt);ArenaData.Credit(p.damageByType,elemental?element:"physical",dealt);
            e.hp-=damage;e.flash=.18f;
            if(impact)
            {
                e.windup=0;e.attackTimer=Math.Max(e.attackTimer,.35f);
                float dx=e.x-p.x,dz=e.z-p.z,d=Distance(dx,dz);float angle=d>.01f?(float)Math.Atan2(dx,dz):facing;
                float nx=(float)Math.Sin(angle),nz=(float)Math.Cos(angle),side=Knockback>0?(Random()*2-1)*.15f:0;
                e.vx=(nx+nz*side)*Knockback;e.vz=(nz-nx*side)*Knockback;
            }
            if(e.hp<=0)p.kills++;
        }
        public void ElementalHit(Actor p,Actor e,float damage,float facing,string weapon,string element)
        {
            if(e.hp<=0)return;DamageEnemy(p,e,damage,facing,weapon,element);
            if(element=="lightning")foreach(var nearby in State.enemies)if(nearby!=e&&nearby.hp>0&&Distance(nearby.x-e.x,nearby.z-e.z)<=2)DamageEnemy(p,nearby,5,facing,weapon,"lightning",false,true);
            if(e.hp<=0)return;
            if(element=="fire"){if(e.burnRemaining<=0)e.burnTick=1;e.burnRemaining=5;e.burnOwner=p.id;e.burnWeapon=weapon;}
            if(element=="poison")e.poisoned=5;if(element=="ice")e.chilled=5;
        }
        void Statuses()
        {
            foreach(var e in State.enemies)
            {
                e.poisoned=Math.Max(0,e.poisoned-Step);e.chilled=Math.Max(0,e.chilled-Step);
                if(e.burnRemaining<=0)continue;
                e.burnTick-=Math.Min(Step,e.burnRemaining);e.burnRemaining-=Step;var p=State.players.Find(a=>a.id==e.burnOwner);
                while(e.burnTick<=.00001f&&e.hp>0&&p!=null){DamageEnemy(p,e,5,e.facing,e.burnWeapon,"fire",false,true);e.burnTick+=1;}
                if(e.burnRemaining<=.00001f||p==null)e.burnRemaining=0;
            }
            State.enemies.RemoveAll(e=>e.hp<=0);
        }
        void Projectiles()
        {
            State.projectiles.RemoveAll(s=>
            {
                var p=State.players.Find(a=>a.id==s.ownerId);var e=State.enemies.Find(a=>a.id==s.targetId&&a.hp>0);s.life-=Step;
                if(p==null||e==null||s.life<=0)return true;
                s.facing=(float)Math.Atan2(e.x-s.x,e.z-s.z);
                if(Distance(e.x-s.x,e.z-s.z)<=s.speed*Step+.3f){ElementalHit(p,e,s.damage,s.facing,s.weapon,s.element);return true;}
                s.x+=(float)Math.Sin(s.facing)*s.speed*Step;s.z+=(float)Math.Cos(s.facing)*s.speed*Step;return false;
            });
            State.enemies.RemoveAll(e=>e.hp<=0);
        }
        void Hurt(Actor e,Actor p,float baseDamage)
        {
            if(p.hp<=0||p.flash>0)return;float damage=baseDamage<=0?0:Math.Max(1,baseDamage*(e.poisoned>0?.5f:1)-p.armorLevel*2);
            p.damageTaken+=Math.Min(p.hp,damage);p.hp=Math.Max(0,p.hp-damage);p.flash=.35f;
        }
        void Enemies()
        {
            // Summoning can append a pack, so process only actors present at the start of this tick.
            foreach(var e in State.enemies.ToArray())
            {
                float scale=ArenaData.Scale(e.enemyType),contact=1.1f+(scale-1)*.45f;
                var p=e.windup>0?State.players.Find(a=>a.id==e.attackTargetId&&a.hp>0):null;
                if(p==null){e.windup=0;p=Nearest(State.players,e);}if(p==null)continue;
                float dx=p.x-e.x,dz=p.z-e.z,d=Distance(dx,dz);Facing(e,(float)Math.Atan2(dx,dz));e.flash=Math.Max(0,e.flash-Step);e.attackTimer-=Step;
                if(Special(e,p)){Move(e,e.vx*Step,e.vz*Step);e.vx*=(float)Math.Exp(-10*Step);e.vz*=(float)Math.Exp(-10*Step);continue;}
                if(e.windup>0){e.windup-=Step;if(e.windup<=0){if(d<=contact+.25f&&p.flash<=0)Hurt(e,p,e.enemyType=="goblin"?GoblinDamage:ArenaData.EnemyDamage(e.enemyType));e.attackTimer=1.2f;}}
                else if(d<contact&&e.attackTimer<=0){e.windup=.45f;e.attackTargetId=p.id;}
                float baseSpeed=e.windup>0||d<contact-.3f?0:e.enemyType=="goblin"?GoblinSpeed:ArenaData.EnemySpeed(e.enemyType);
                if(e.enemyType=="runner"&&d>3){float side=e.id%2==1?1:-1,x=dx;dx=dx*.9f-dz*.44f*side;dz=dz*.9f+x*.44f*side;}
                if(e.enemyType=="revenant"&&e.windup<=0){baseSpeed=3.5f;if(d<5){dx=-dx;dz=-dz;}else if(d<=7){float x=dx;dx=-dz;dz=x;}}
                float speed=baseSpeed*(e.chilled>0?.5f:1);
                TerrainItem blocking=null;float first=float.MaxValue;
                if(TerrainCollision)foreach(var o in Terrain.Obstacles)
                {
                    float t=((o.x-e.x)*dx+(o.z-e.z)*dz)/Math.Max(.01f,d*d);
                    if(t>0&&t<1&&t<first&&Distance(e.x+dx*t-o.x,e.z+dz*t-o.z)<o.radius+.5f*scale+.35f){blocking=o;first=t;}
                }
                if(blocking!=null){var o=blocking;float r=o.radius+.5f*scale+.65f,angle=(float)Math.Atan2(e.z-o.z,e.x-o.x)+(e.id%2==1?1:-1)*.65f;dx=o.x+(float)Math.Cos(angle)*r-e.x;dz=o.z+(float)Math.Sin(angle)*r-e.z;d=Distance(dx,dz);}
                Move(e,(dx/Math.Max(.01f,d)*speed+e.vx)*Step,(dz/Math.Max(.01f,d)*speed+e.vz)*Step);
                e.vx*=(float)Math.Exp(-10*Step);e.vz*=(float)Math.Exp(-10*Step);Bound(e);
            }
            for(int i=0;i<State.enemies.Count;i++)
            {
                var a=State.enemies[i];
                for(int j=i+1;j<State.enemies.Count;j++)
                {
                    var b=State.enemies[j];float dx=b.x-a.x,dz=b.z-a.z,d=Distance(dx,dz),r=.39f*(ArenaData.Scale(a.enemyType)+ArenaData.Scale(b.enemyType));
                    if(d<r){float push=(r-d)*.5f,nx=d>.001f?dx/d:1,nz=d>.001f?dz/d:0;a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;}
                }
                foreach(var p in State.players)if(p.hp>0){float dx=a.x-p.x,dz=a.z-p.z,d=Distance(dx,dz),r=.46f+.39f*ArenaData.Scale(a.enemyType);if(d<r){a.x=p.x+(d>.001f?dx/d:1)*r;a.z=p.z+(d>.001f?dz/d:0)*r;}}
                Bound(a);
            }
            foreach(var e in State.enemies)Bound(e);
        }
        bool Special(Actor e,Actor p)
        {
            string t=e.enemyType;if(t=="goblin"||t=="")return false;
            float windup=t=="runner"?.65f:t=="brute"?1.05f:t=="revenant"?1.2f:1.4f;
            float active=t=="runner"?.65f:t=="brute"?.18f:t=="revenant"?2.8f:.2f;
            float recovery=t=="runner"?1:t=="brute"?1.1f:t=="revenant"?.5f:.7f;
            float cooldown=t=="runner"?4:t=="brute"?5:t=="revenant"?6:14;
            float range=t=="runner"?8:t=="brute"?3.4f:t=="revenant"?10:float.MaxValue;
            float radius=t=="runner"?.9f:t=="brute"?3:t=="revenant"?2.2f:3;
            var ai=e.ai??(e.ai=new SpecialAction{cooldown=t=="boss"?7:2+(e.id%3)*.4f,x=e.x,z=e.z,facing=e.facing});ai.cooldown=Math.Max(0,ai.cooldown-Step);
            if(ai.mode=="idle")
            {
                float d=Distance(p.x-e.x,p.z-e.z);if(ai.cooldown>0||e.windup>0||d>range||(t=="runner"&&d<3))return false;
                ai.mode="warning";ai.remaining=windup;ai.hitIds.Clear();ai.pulse=0;ai.x=t=="revenant"?p.x:e.x;ai.z=t=="revenant"?p.z:e.z;ai.facing=(float)Math.Atan2(p.x-e.x,p.z-e.z);e.windup=e.vx=e.vz=0;return true;
            }
            Facing(e,ai.facing);ai.remaining-=Step;
            if(ai.mode=="warning"){if(ai.remaining<=0){ai.mode="active";ai.remaining=active;if(t=="boss"&&Spawning&&State.elapsed<60)SpawnPack();}return true;}
            if(ai.mode=="active")
            {
                if(t=="runner"){float speed=10*(e.chilled>0?.5f:1),x=e.x,z=e.z;Move(e,(float)Math.Sin(ai.facing)*speed*Step,(float)Math.Cos(ai.facing)*speed*Step);if(Distance(e.x-x,e.z-z)<speed*Step*.4f)ai.remaining=0;}
                ai.pulse-=Step;
                foreach(var player in State.players)if(player.hp>0&&Distance(player.x-(t=="runner"?e.x:ai.x),player.z-(t=="runner"?e.z:ai.z))<=radius+.45f)
                {
                    if(t=="revenant"){player.chilled=Math.Max(player.chilled,.25f);if(ai.pulse<=0)Hurt(e,player,6);}
                    else if(t!="boss"&&!ai.hitIds.Contains(player.id)){Hurt(e,player,t=="runner"?8:18);ai.hitIds.Add(player.id);}
                }
                if(ai.pulse<=0)ai.pulse=1;if(ai.remaining<=0){ai.mode="recovery";ai.remaining=recovery;ai.cooldown=cooldown;}return true;
            }
            if(ai.remaining<=0){ai.mode="idle";e.attackTimer=Math.Max(e.attackTimer,.3f);}return true;
        }
    }
}
