using System;
using System.Collections.Generic;
using FantasyArena.Core;
using UnityEngine;
namespace FantasyArena
{
    [Serializable] public sealed class RigPart { public string name,parent,role; public float[] position,anchor; }
    [Serializable] public sealed class RigModel { public string id;public RigPart[] parts; }
    [Serializable] public sealed class RigFile { public RigModel[] models; }
    public sealed class ArenaPose : MonoBehaviour
    {
        static RigFile rigs;
        readonly Dictionary<string,Transform> objects=new Dictionary<string,Transform>();
        readonly Dictionary<string,Matrix4x4> poses=new Dictionary<string,Matrix4x4>();
        readonly Dictionary<string,Vector3> scales=new Dictionary<string,Vector3>();
        RigModel rig;
        public void Setup(string kind,string equipment)
        {
            if(rigs==null)rigs=JsonUtility.FromJson<RigFile>(Resources.Load<TextAsset>("rigs").text);
            rig=Array.Find(rigs.models,m=>m.id==kind);
            foreach(var t in GetComponentsInChildren<Transform>())if(t!=transform&&!objects.ContainsKey(t.name)){objects[t.name]=t;scales[t.name]=t.localScale;}
            if(equipment!=""&&objects.TryGetValue("weapon",out var original))
            {
                var prefab=Resources.Load<GameObject>("Models/Weapons/"+equipment.Replace("_poison","_acid"));
                if(prefab!=null)
                {
                    original.gameObject.SetActive(false);
                    var gear=Instantiate(prefab,transform);
                    foreach(var t in gear.GetComponentsInChildren<Transform>())if(t.name=="weapon"){objects["weapon"]=t;scales["weapon"]=t.localScale;break;}
                }
            }
        }
        static Vector3 V(float[] p)=>p==null?Vector3.zero:new Vector3(-p[0],p[1],p[2]);
        public void Apply(Actor actor,float time,bool celebrating=false,bool playing=true)
        {
            if(rig==null)return;
            float speed=new Vector2(actor.vx,actor.vz).magnitude;
            if(actor.enemyType!="")speed=actor.windup>0||actor.ai!=null&&actor.ai.mode!="idle"?0:ArenaData.EnemySpeed(actor.enemyType);
            if(!playing)speed=0;
            float stride=Mathf.Sin(time*10+actor.id)*Mathf.Min(.55f,speed*.08f);
            foreach(var part in rig.parts)
            {
                if(!objects.TryGetValue(part.name,out var target))continue;
                string parent=part.parent;var anchor=part.anchor;
                if(part.name=="weapon"){parent="forearm_r";anchor=part.position;}
                if(part.name=="shield"){parent="forearm_l";anchor=part.position;}
                Matrix4x4 matrix;
                if(string.IsNullOrEmpty(parent)||anchor==null||!poses.TryGetValue(parent,out var parentMatrix))matrix=Matrix4x4.Translate(V(part.position));
                else
                {
                    var parentPart=Array.Find(rig.parts,p=>p.name==parent);
                    float angle=0;
                    if(part.name.StartsWith("thigh_"))angle=part.name.EndsWith("_l")?stride:-stride;
                    if(part.name.StartsWith("shin_"))angle=Mathf.Max(0,part.name.EndsWith("_l")?-stride:stride)*.8f;
                    if(part.name.StartsWith("upper_arm_"))angle=(part.name.EndsWith("_l")?-stride:stride)*.95f;
                    if(part.name.StartsWith("forearm_"))angle=-.15f-Mathf.Abs(stride)*.4f;
                    if(part.name=="upper_arm_r"){if(actor.windup>0)angle=-1.15f;else if(actor.swing>0)angle=-1.15f+1.8f*(1-actor.swing/.23f);}
                    if(celebrating&&part.name.StartsWith("upper_arm_"))angle=-2.5f+Mathf.Sin(time*5)*.2f;
                    if(ArenaData.Ranged(actor.character)&&actor.enemyType==""&&part.name=="upper_arm_r")angle=actor.character=="archer"?-.65f:-.25f;
                    matrix=parentMatrix*Matrix4x4.Translate(V(anchor)-V(parentPart.position))*Matrix4x4.Rotate(Quaternion.Euler(angle*Mathf.Rad2Deg,0,0));
                    if(part.name=="weapon"&&!ArenaData.Ranged(actor.character))matrix*=Matrix4x4.Rotate(Quaternion.Euler(0,-(actor.swing>0?-1+(1-actor.swing/.23f)*2:actor.windup>0?-.8f:.12f)*Mathf.Rad2Deg,0));
                    matrix*=Matrix4x4.Translate(V(part.position)-V(anchor));
                }
                poses[part.name]=matrix;
                if(!playing&&!celebrating)matrix=Matrix4x4.Translate(Vector3.up*Mathf.Sin(time*2+actor.id)*.025f)*matrix;
                // Imported parts share a scene parent; apply root-space poses in world space.
                Matrix4x4 world=transform.localToWorldMatrix*matrix;
                target.SetPositionAndRotation(world.GetColumn(3),world.rotation);
            }
        }
    }
}
