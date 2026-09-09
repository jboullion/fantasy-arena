using System;
using System.Collections.Generic;
namespace FantasyArena.Core
{
    [Serializable] public sealed class TerrainItem {public float x,z,radius,scale,rotation;public string model;}
    public sealed class ArenaTerrain
    {
        public readonly List<TerrainItem> Obstacles=new List<TerrainItem>(),Walls=new List<TerrainItem>(),Grass=new List<TerrainItem>();
        uint seed=7319;
        double Random(){seed=unchecked(seed*1664525+1013904223);return seed/4294967296.0;}
        public ArenaTerrain()
        {
            for(int i=0;i<64*56/95;i++)for(int attempt=0;attempt<100;attempt++)
            {
                double x=(Random()-.5)*52,z=(Random()-.5)*44;
                bool tree=Random()<.45;double scale=.8+Random()*.5,radius=(tree?.48:1.05)*scale;
                if(Math.Sqrt(x*x+z*z)<7+radius||Obstacles.Exists(o=>Math.Sqrt((o.x-x)*(o.x-x)+(o.z-z)*(o.z-z))<o.radius+radius+3.5))continue;
                Obstacles.Add(new TerrainItem{x=(float)x,z=(float)z,scale=(float)scale,radius=(float)radius,rotation=(float)(Random()*Math.PI*2),model=(tree?"tree-":"rock-")+(i%3)});break;
            }
            foreach(int side in new[]{-1,1})
            {
                for(double x=-34;x<=34;x+=2.2)Walls.Add(Wall((float)x,side*29.6f));
                for(double z=-28;z<=28;z+=2.2)Walls.Add(Wall(side*33.6f,(float)z));
            }
            int count=Walls.Count;
            for(int i=0;i<count;i+=2){var o=Walls[i];Walls.Add(new TerrainItem{x=o.x+Math.Sign(o.x)*1.5f,z=o.z+Math.Sign(o.z)*1.5f,rotation=o.rotation,scale=(float)(1.5+Random()*.7),model="tree-"+(i%3)});}
            for(int i=0;i<64*56/3;i++)
            {
                var g=new TerrainItem{x=(float)((Random()-.5)*62),z=(float)((Random()-.5)*54),rotation=(float)(Random()*6.28),scale=(float)(.65+Random()*.65),model="grass-"+(i%3)};
                if(!Obstacles.Exists(o=>ArenaSimulation.Distance(g.x-o.x,g.z-o.z)<o.radius+.25f))Grass.Add(g);
            }
        }
        TerrainItem Wall(float x,float z)=>new TerrainItem{x=x,z=z,radius=1.8f,scale=(float)(1.9+Random()*.6),rotation=(float)(Random()*6.28),model="rock-"+(Walls.Count%3)};
    }
}
