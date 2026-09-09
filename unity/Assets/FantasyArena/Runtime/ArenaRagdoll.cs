using System.Collections.Generic;
using UnityEngine;

namespace FantasyArena
{
    // Presentation-only bodies. Never feed PhysX transforms back into combat state.
    public sealed class ArenaRagdoll : MonoBehaviour
    {
        readonly List<Rigidbody> bodies=new List<Rigidbody>();
        public void Build(Vector3 impulse)
        {
            var renderers=GetComponentsInChildren<MeshRenderer>();
            Rigidbody torso=null;
            var colliders=new List<Collider>();
            foreach(var renderer in renderers)
            {
                if(!renderer.gameObject.activeInHierarchy)continue;
                var t=renderer.transform;
                var bounds=renderer.bounds;
                if(bounds.size.sqrMagnitude<.001f)continue;
                // A wrapper gives each imported mesh a collider in world-aligned coordinates.
                var body=new GameObject("Cosmetic body "+t.name);body.transform.SetParent(transform,true);body.transform.position=bounds.center;
                t.SetParent(body.transform,true);
                var box=body.AddComponent<BoxCollider>();box.size=bounds.size*.8f;
                var rb=body.AddComponent<Rigidbody>();rb.mass=t.name.Contains("torso")?3:.5f;rb.linearDamping=.8f;rb.angularDamping=1.8f;
                rb.collisionDetectionMode=CollisionDetectionMode.ContinuousSpeculative;
                bodies.Add(rb);colliders.Add(box);
                if(t.name.Contains("torso"))torso=rb;
                rb.AddForce(impulse,ForceMode.VelocityChange);
                rb.AddTorque(new Vector3(1.2f,.4f,-.7f),ForceMode.VelocityChange);
            }
            if(torso==null&&bodies.Count>0)torso=bodies[0];
            foreach(var rb in bodies)
            {
                if(rb==torso||rb.GetComponentInChildren<MeshRenderer>().name.Contains("weapon"))continue;
                var joint=rb.gameObject.AddComponent<CharacterJoint>();joint.connectedBody=torso;
                joint.anchor=Vector3.zero;joint.enableProjection=true;
                joint.lowTwistLimit=new SoftJointLimit{limit=-35};joint.highTwistLimit=new SoftJointLimit{limit=35};
                joint.swing1Limit=new SoftJointLimit{limit=45};joint.swing2Limit=new SoftJointLimit{limit=35};
            }
            for(int i=0;i<colliders.Count;i++)for(int j=i+1;j<colliders.Count;j++)Physics.IgnoreCollision(colliders[i],colliders[j]);
        }
        public void Pause(bool paused){foreach(var body in bodies)if(body!=null&&body.isKinematic!=paused)body.isKinematic=paused;}
    }
}
