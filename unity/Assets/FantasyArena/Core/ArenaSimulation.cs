using System;
using System.Collections.Generic;

namespace FantasyArena.Core
{
    [Serializable] public sealed class Actor
    {
        public int id;
        public float x, z, hp = 100, attackTimer, facingX, facingZ = 1;
        public int kills;
    }
    [Serializable] public sealed class World
    {
        public int protocol = 1, tick;
        public float elapsed;
        public string stage = "lobby";
        public List<Actor> players = new List<Actor>();
        public List<Actor> enemies = new List<Actor>();
    }
    public sealed class ArenaSimulation
    {
        public const float Step = 1f / 60;
        public World State = new World();
        readonly Dictionary<int, (float x, float z)> inputs = new Dictionary<int, (float, float)>();
        uint seed = 7319;
        int nextEnemy = 100;
        float spawnTimer;
        public void AddPlayer(int id)
        {
            if (State.players.Exists(p => p.id == id) || State.players.Count >= 4) return;
            State.players.Add(new Actor { id = id, x = State.players.Count * 2 });
        }
        public void SetInput(int id, float x, float z)
        {
            if (float.IsNaN(x) || float.IsInfinity(x) || float.IsNaN(z) || float.IsInfinity(z)) return;
            float length = (float)Math.Sqrt(x * x + z * z);
            if (length > 1) { x /= length; z /= length; }
            inputs[id] = (x, z);
        }
        public void Start()
        {
            State.elapsed = 0; State.tick = 0; State.stage = "playing"; State.enemies.Clear();
            seed = 7319; nextEnemy = 100; spawnTimer = 0; inputs.Clear();
            foreach (var p in State.players) { p.hp = 100; p.kills = 0; p.attackTimer = 0; }
        }
        float Random()
        {
            seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
            return (seed & 0xffffff) / 16777216f;
        }
        public void Tick()
        {
            if (State.stage != "playing") return;
            State.tick++; State.elapsed = State.tick * Step;
            foreach (var p in State.players)
            {
                if (p.hp <= 0) continue;
                if (inputs.TryGetValue(p.id, out var input))
                {
                    p.x = Math.Clamp(p.x + input.x * 7 * Step, -31, 31);
                    p.z = Math.Clamp(p.z + input.z * 7 * Step, -27, 27);
                }
                p.attackTimer -= Step;
                Actor target = Nearest(State.enemies, p, out float distance);
                if (target != null && distance <= 2.7f && p.attackTimer <= 0)
                {
                    float dx = target.x - p.x, dz = target.z - p.z;
                    float len = Math.Max(.001f, distance); p.facingX = dx / len; p.facingZ = dz / len;
                    p.attackTimer = .85f;
                    foreach (var enemy in State.enemies)
                    {
                        dx = enemy.x - p.x; dz = enemy.z - p.z; len = (float)Math.Sqrt(dx * dx + dz * dz);
                        if (enemy.hp <= 0 || len > 2.7f || (len > .001f && (dx * p.facingX + dz * p.facingZ) / len < .4226f)) continue;
                        enemy.hp -= 25;
                        if (enemy.hp <= 0) p.kills++;
                    }
                }
            }
            State.enemies.RemoveAll(e => e.hp <= 0);
            spawnTimer -= Step;
            if (spawnTimer <= 0 && State.enemies.Count < 200)
            {
                spawnTimer = 2.4f;
                float angle = Random() * (float)Math.PI * 2;
                State.enemies.Add(new Actor { id = nextEnemy++, hp = 50, x = (float)Math.Cos(angle) * 14, z = (float)Math.Sin(angle) * 14 });
            }
            foreach (var enemy in State.enemies)
            {
                Actor target = Nearest(State.players, enemy, out float distance);
                if (target == null) continue;
                float dx = target.x - enemy.x, dz = target.z - enemy.z;
                float len = Math.Max(.001f, distance);
                enemy.facingX = dx / len; enemy.facingZ = dz / len;
                enemy.attackTimer -= Step;
                if (distance > 1.1f)
                { enemy.x += dx / len * 2.8f * Step; enemy.z += dz / len * 2.8f * Step; }
                else if (enemy.attackTimer <= 0)
                { target.hp = Math.Max(0, target.hp - 10); enemy.attackTimer = 1.2f; }
            }
            if (!State.players.Exists(p => p.hp > 0)) State.stage = "defeat";
            else if (State.elapsed >= 60) State.stage = "victory";
        }
        static Actor Nearest(List<Actor> actors, Actor origin, out float distance)
        {
            Actor best = null; float squared = float.MaxValue;
            foreach (var actor in actors)
            {
                if (actor.hp <= 0) continue;
                float dx = actor.x - origin.x, dz = actor.z - origin.z, d = dx * dx + dz * dz;
                if (d < squared) { squared = d; best = actor; }
            }
            distance = (float)Math.Sqrt(squared); return best;
        }
    }
}
