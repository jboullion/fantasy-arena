using System;
using System.IO;
using System.Collections.Generic;
using FantasyArena.Core;
using UnityEngine;

namespace FantasyArena
{
    [Serializable] public sealed class RunReport
    {
        public string id, stage, savedUtc;
        public int round, roundsCompleted;
        public List<Actor> players;
    }
    [Serializable] public sealed class ReportFile { public int version = 1; public List<RunReport> runs = new List<RunReport>(); }
    public static class ArenaArchive
    {
        public static string DirectoryOverride;
        public static string Folder => DirectoryOverride ?? Application.persistentDataPath;
        public static string PathName => Path.Combine(Folder, "run-reports.v1.json");
        public static ReportFile Load()
        {
            if (!File.Exists(PathName)) return new ReportFile();
            var data = JsonUtility.FromJson<ReportFile>(File.ReadAllText(PathName));
            if (data == null || data.version != 1 || data.runs == null) throw new InvalidDataException("Unsupported or corrupt run-report file; original retained.");
            return data;
        }
        public static void Save(World world)
        {
            var data = Load();
            var copy = JsonUtility.FromJson<World>(JsonUtility.ToJson(world));
            data.runs.RemoveAll(r => r.id == world.runId);
            data.runs.Insert(0, new RunReport { id = world.runId, stage = world.stage, round = world.round, roundsCompleted = world.roundsCompleted, savedUtc = DateTime.UtcNow.ToString("O"), players = copy.players });
            if (data.runs.Count > 20) data.runs.RemoveRange(20, data.runs.Count - 20);
            Directory.CreateDirectory(Folder);
            string temporary = PathName + ".tmp";
            File.WriteAllText(temporary, JsonUtility.ToJson(data, true));
            if (File.Exists(PathName)) File.Replace(temporary, PathName, PathName + ".backup");
            else File.Move(temporary, PathName);
        }
    }
}
