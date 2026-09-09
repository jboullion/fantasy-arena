using System.Collections.Generic;
using UnityEngine;

namespace FantasyArena
{
    public sealed class ArenaPresentation : MonoBehaviour
    {
        public ArenaSession Session;
        public bool Muted {get;private set;}
        AudioSource source;
        readonly Dictionary<string,AudioClip> clips=new Dictionary<string,AudioClip>();
        readonly Queue<GameObject> corpses=new Queue<GameObject>();
        readonly List<ParticleSystem> effects=new List<ParticleSystem>();
        Material material;
        float nextSound;
        string stage="";
        int tick;
        public int DeathCount {get;private set;}
        public int EffectCount {get;private set;}
        public int SoundCount {get;private set;}
        void Awake()
        {
            source=gameObject.AddComponent<AudioSource>();source.playOnAwake=false;source.spatialBlend=0;source.volume=.25f;
            Muted=PlayerPrefs.GetInt("arena.audio.muted",0)==1;
            material=new Material(Shader.Find("Universal Render Pipeline/Lit"));
            foreach(string id in new[]{"hit","swing","magic","step","death","win","lose","click"})clips[id]=Synth(id);
        }
        public void ToggleMute(){Muted=!Muted;PlayerPrefs.SetInt("arena.audio.muted",Muted?1:0);PlayerPrefs.Save();if(Muted)source.Stop();}
        public void Sound(string id,bool priority=false)
        {
            if(Muted||Session!=null&&Session.Paused||!priority&&Time.unscaledTime<nextSound)return;
            nextSound=Time.unscaledTime+.07f;source.PlayOneShot(clips[id]);SoundCount++;
        }
        public void Burst(Vector3 position,Color color,int count=12)
        {
            effects.RemoveAll(p=>p==null);if(effects.Count>=48)return;
            var go=new GameObject("Combat sparks");go.transform.position=position+Vector3.up;
            var ps=go.AddComponent<ParticleSystem>();ps.Stop(true,ParticleSystemStopBehavior.StopEmittingAndClear);
            var main=ps.main;main.loop=false;main.duration=.6f;main.startLifetime=.4f;main.startSpeed=3;main.startSize=.09f;main.startColor=color;main.gravityModifier=1;main.maxParticles=24;
            var emission=ps.emission;emission.enabled=false;var shape=ps.shape;shape.shapeType=ParticleSystemShapeType.Sphere;shape.radius=.15f;
            ps.GetComponent<ParticleSystemRenderer>().sharedMaterial=material;ps.Emit(count);effects.Add(ps);Destroy(go,1.5f);EffectCount++;
        }
        public void Corpse(GameObject model,Vector3 impulse)
        {
            model.GetComponent<ArenaPose>().enabled=false;
            var body=model.AddComponent<ArenaRagdoll>();body.Build(impulse+Vector3.up*2);
            corpses.Enqueue(model);DeathCount++;Sound("death");
            while(corpses.Count>24){var old=corpses.Dequeue();if(old!=null)Destroy(old);}
        }
        void Update()
        {
            if(Session==null)return;
            var world=Session.World;
            if(world.tick<tick||Session.Mode=="Menu")Clear();
            if(stage!=world.stage){if(world.stage=="victory"||world.stage=="shop")Sound("win",true);if(world.stage=="defeat")Sound("lose",true);}
            foreach(var corpse in corpses)if(corpse!=null)corpse.GetComponent<ArenaRagdoll>().Pause(Session.Paused);
            stage=world.stage;tick=world.tick;
        }
        void Clear(){while(corpses.Count>0){var go=corpses.Dequeue();if(go!=null)Destroy(go);}}
        static AudioClip Synth(string id)
        {
            const int rate=22050;float duration=id=="win"||id=="lose"?.8f:id=="death"?.3f:.12f;
            var data=new float[(int)(rate*duration)];var random=new System.Random(731);
            for(int i=0;i<data.Length;i++)
            {
                float t=i/(float)rate,p=t/duration;
                float freq=id=="win"?new[]{523f,659f,784f}[(int)(p*3)%3]:id=="lose"?220-110*p:id=="magic"?700+900*p:id=="click"?700:id=="step"?90:id=="death"?140-90*p:260-180*p;
                float noise=(float)random.NextDouble()*2-1;
                data[i]=(Mathf.Sin(2*Mathf.PI*freq*t)*.6f+noise*(id=="hit"||id=="swing"?.4f:.07f))*Mathf.Sin(Mathf.PI*Mathf.Min(1,p*12))*Mathf.Pow(1-p,2)*.5f;
            }
            var clip=AudioClip.Create("Arena "+id,data.Length,1,rate,false);clip.SetData(data,0);return clip;
        }
        void OnDestroy(){Clear();foreach(var clip in clips.Values)Destroy(clip);if(material!=null)Destroy(material);foreach(var ps in effects)if(ps!=null)Destroy(ps.gameObject);}
    }
}
