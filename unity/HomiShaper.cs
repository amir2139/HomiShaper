// HomiShaper for Unity — port of shaper.js (join Persian/Arabic letters + visual reordering for LTR-only text renderers).
// Usage:  myText.text = HomiShaper.Fix("سلام دنیا");   // works with UI.Text / TextMeshPro / TextMesh
// Needs a font that contains the Arabic Presentation Forms-A/B glyphs (FB50–FDFF, FE70–FEFF).
using System.Collections.Generic;
using System.Text;

public static class HomiShaper
{
    // letter -> { isolated, final, initial, medial } (0 = form does not exist)
    static readonly Dictionary<int, int[]> T = new Dictionary<int, int[]>
    {
        {0x621,new[]{0xFE80,0,0,0}},{0x622,new[]{0xFE81,0xFE82,0,0}},{0x623,new[]{0xFE83,0xFE84,0,0}},
        {0x624,new[]{0xFE85,0xFE86,0,0}},{0x625,new[]{0xFE87,0xFE88,0,0}},{0x626,new[]{0xFE89,0xFE8A,0xFE8B,0xFE8C}},
        {0x627,new[]{0xFE8D,0xFE8E,0,0}},{0x628,new[]{0xFE8F,0xFE90,0xFE91,0xFE92}},{0x629,new[]{0xFE93,0xFE94,0,0}},
        {0x62A,new[]{0xFE95,0xFE96,0xFE97,0xFE98}},{0x62B,new[]{0xFE99,0xFE9A,0xFE9B,0xFE9C}},
        {0x62C,new[]{0xFE9D,0xFE9E,0xFE9F,0xFEA0}},{0x62D,new[]{0xFEA1,0xFEA2,0xFEA3,0xFEA4}},
        {0x62E,new[]{0xFEA5,0xFEA6,0xFEA7,0xFEA8}},{0x62F,new[]{0xFEA9,0xFEAA,0,0}},{0x630,new[]{0xFEAB,0xFEAC,0,0}},
        {0x631,new[]{0xFEAD,0xFEAE,0,0}},{0x632,new[]{0xFEAF,0xFEB0,0,0}},{0x633,new[]{0xFEB1,0xFEB2,0xFEB3,0xFEB4}},
        {0x634,new[]{0xFEB5,0xFEB6,0xFEB7,0xFEB8}},{0x635,new[]{0xFEB9,0xFEBA,0xFEBB,0xFEBC}},
        {0x636,new[]{0xFEBD,0xFEBE,0xFEBF,0xFEC0}},{0x637,new[]{0xFEC1,0xFEC2,0xFEC3,0xFEC4}},
        {0x638,new[]{0xFEC5,0xFEC6,0xFEC7,0xFEC8}},{0x639,new[]{0xFEC9,0xFECA,0xFECB,0xFECC}},
        {0x63A,new[]{0xFECD,0xFECE,0xFECF,0xFED0}},{0x641,new[]{0xFED1,0xFED2,0xFED3,0xFED4}},
        {0x642,new[]{0xFED5,0xFED6,0xFED7,0xFED8}},{0x643,new[]{0xFED9,0xFEDA,0xFEDB,0xFEDC}},
        {0x644,new[]{0xFEDD,0xFEDE,0xFEDF,0xFEE0}},{0x645,new[]{0xFEE1,0xFEE2,0xFEE3,0xFEE4}},
        {0x646,new[]{0xFEE5,0xFEE6,0xFEE7,0xFEE8}},{0x647,new[]{0xFEE9,0xFEEA,0xFEEB,0xFEEC}},
        {0x648,new[]{0xFEED,0xFEEE,0,0}},{0x649,new[]{0xFEEF,0xFEF0,0,0}},{0x64A,new[]{0xFEF1,0xFEF2,0xFEF3,0xFEF4}},
        {0x67E,new[]{0xFB56,0xFB57,0xFB58,0xFB59}},{0x686,new[]{0xFB7A,0xFB7B,0xFB7C,0xFB7D}},
        {0x698,new[]{0xFB8A,0xFB8B,0,0}},{0x6A9,new[]{0xFB8E,0xFB8F,0xFEDB,0xFEDC}},
        {0x6AF,new[]{0xFB92,0xFB93,0xFB94,0xFB95}},{0x6CC,new[]{0xFBFC,0xFBFD,0xFEF3,0xFEF4}},
    };

    // alef variant -> { isolated, final } lam-alef ligature
    static readonly Dictionary<int, int[]> LamAlef = new Dictionary<int, int[]>
    {
        {0x622,new[]{0xFEF5,0xFEF6}},{0x623,new[]{0xFEF7,0xFEF8}},{0x625,new[]{0xFEF9,0xFEFA}},{0x627,new[]{0xFEFB,0xFEFC}},
    };

    const int Lam = 0x644, Tatweel = 0x640, Zwnj = 0x200C, Zwj = 0x200D;

    static bool IsMark(int c)
    {
        return (c >= 0x64B && c <= 0x65F) || c == 0x670 || (c >= 0x610 && c <= 0x61A) ||
               (c >= 0x6D6 && c <= 0x6DC) || (c >= 0x6DF && c <= 0x6E4) || c == 0x6E7 || c == 0x6E8 ||
               (c >= 0x6EA && c <= 0x6ED) || (c >= 0x300 && c <= 0x36F);
    }
    static bool IsDiacritic(int c) { return IsMark(c) && !(c >= 0x300 && c <= 0x36F); }

    static bool JoinsNext(int c) { int[] e; return c == Zwj || c == Tatweel || (T.TryGetValue(c, out e) && e[2] != 0); }
    static bool JoinsPrev(int c) { return c == Zwj || c == Tatweel || (c != 0x621 && T.ContainsKey(c)); }

    /// <summary>Full pipeline: wrap (optional) -> join letters -> visual reorder. Lines are separated by '\n'.</summary>
    /// <param name="maxLength">Max characters per line, 0 = no wrapping.</param>
    public static string Fix(string text, int maxLength = 0, bool stripDiacritics = false)
    {
        if (string.IsNullOrEmpty(text)) return text;
        var lines = Wrap(text, maxLength);
        for (int i = 0; i < lines.Count; i++) lines[i] = Reorder(Shape(lines[i], stripDiacritics));
        return string.Join("\n", lines.ToArray());
    }

    /// <summary>Replace letters with joined presentation forms (logical order).</summary>
    public static string Shape(string text, bool stripDiacritics = false)
    {
        var cs = new List<int>();
        foreach (char ch in text) if (!(stripDiacritics && IsDiacritic(ch))) cs.Add(ch);
        int n = cs.Count;
        var sb = new StringBuilder(n);
        for (int i = 0; i < n; i++)
        {
            int c = cs[i];
            int[] e;
            if (c == Zwnj || c == Zwj) continue;
            if (!T.TryGetValue(c, out e)) { sb.Append((char)c); continue; }

            int p = i - 1; while (p >= 0 && IsMark(cs[p])) p--;
            bool joinPrev = p >= 0 && JoinsNext(cs[p]) && c != 0x621;

            int[] lig;
            if (c == Lam && i + 1 < n && LamAlef.TryGetValue(cs[i + 1], out lig))
            {
                sb.Append((char)lig[joinPrev ? 1 : 0]);
                i++;
                continue;
            }

            int q = i + 1; while (q < n && IsMark(cs[q])) q++;
            bool joinNext = e[2] != 0 && q < n && JoinsPrev(cs[q]);
            int form = joinPrev ? (joinNext ? 3 : 1) : (joinNext ? 2 : 0);
            sb.Append((char)(e[form] != 0 ? e[form] : e[0]));
        }
        return sb.ToString();
    }

    // ---- bidi (simplified UAX #9, RTL paragraph) ----
    class Cl { public string S; public char T; public bool Rtl; public char R; }

    static char Mirror(char c)
    {
        switch (c)
        {
            case '(': return ')'; case ')': return '(';
            case '[': return ']'; case ']': return '[';
            case '{': return '}'; case '}': return '{';
            case '<': return '>'; case '>': return '<';
            case '«': return '»'; case '»': return '«';
            case '‹': return '›'; case '›': return '‹';
        }
        return c;
    }

    static char TypeOf(char c)
    {
        if ((c >= '0' && c <= '9') || (c >= 0x660 && c <= 0x669) || (c >= 0x6F0 && c <= 0x6F9)) return 'E'; // number
        if ((c >= 0x590 && c <= 0x8FF) || (c >= 0xFB1D && c <= 0xFDFF) || (c >= 0xFE70 && c <= 0xFEFF))
        {
            if (c == 0x60C || c == 0x61B || c == 0x61F || c == 0x66A || c == 0x66B || c == 0x66C || c == 0x6D4) return 'N';
            return 'R';
        }
        if (char.IsLetterOrDigit(c) || char.IsSurrogate(c)) return 'L';
        return 'N';
    }

    /// <summary>Reorder one shaped line into visual left-to-right order.</summary>
    public static string Reorder(string text)
    {
        var cl = new List<Cl>();
        for (int i = 0; i < text.Length; i++)
        {
            char ch = text[i];
            if (IsMark(ch) && cl.Count > 0) { cl[cl.Count - 1].S += ch; continue; }
            if (char.IsHighSurrogate(ch) && i + 1 < text.Length) { cl.Add(new Cl { S = text.Substring(i, 2), T = 'L' }); i++; continue; }
            cl.Add(new Cl { S = ch.ToString(), T = TypeOf(ch) });
        }
        int n = cl.Count, j;
        const string CS = ",.:/،٫٬", ES = "+-", ET = "#$%°٪£€";

        for (int i = 1; i < n - 1; i++)
            if (cl[i].T == 'N' && cl[i - 1].T == 'E' && cl[i + 1].T == 'E' && (CS.Contains(cl[i].S) || ES.Contains(cl[i].S)))
                cl[i].T = 'E';
        for (int i = 0; i < n; i++)
        {
            if (cl[i].T != 'N' || !ET.Contains(cl[i].S)) continue;
            j = i; while (j < n && cl[j].T == 'N' && ET.Contains(cl[j].S)) j++;
            if ((j < n && cl[j].T == 'E') || (i > 0 && cl[i - 1].T == 'E'))
                for (int k = i; k < j; k++) cl[k].T = 'E';
            i = j - 1;
        }
        char last = 'R';
        for (int i = 0; i < n; i++)
        {
            if (cl[i].T == 'L' || cl[i].T == 'R') last = cl[i].T;
            else if (cl[i].T == 'E' && last == 'L') cl[i].T = 'L';
        }
        for (int i = 0; i < n; i++)
        {
            if (cl[i].T != 'N') continue;
            j = i; while (j < n && cl[j].T == 'N') j++;
            char a = i > 0 ? (cl[i - 1].T == 'L' ? 'L' : 'R') : 'R';
            char b = j < n ? (cl[j].T == 'L' ? 'L' : 'R') : 'R';
            for (int m = i; m < j; m++) cl[m].R = a == b ? a : 'R';
            i = j - 1;
        }
        var lv = new int[n];
        var order = new int[n];
        for (int i = 0; i < n; i++)
        {
            char t = cl[i].T == 'N' ? cl[i].R : cl[i].T;
            cl[i].Rtl = t == 'R';
            lv[i] = t == 'R' ? 1 : 2;
            order[i] = i;
        }
        for (int level = 2; level >= 1; level--)
            for (int i = 0; i < n; i++)
            {
                if (lv[order[i]] < level) continue;
                j = i; while (j < n && lv[order[j]] >= level) j++;
                System.Array.Reverse(order, i, j - i);
                i = j - 1;
            }
        var sb = new StringBuilder(text.Length);
        foreach (int idx in order)
        {
            var x = cl[idx];
            sb.Append(x.Rtl && x.S.Length == 1 ? Mirror(x.S[0]).ToString() : x.S);
        }
        return sb.ToString();
    }

    /// <summary>Greedy word wrap in logical order (0 = off). Hard-splits words longer than maxLength.</summary>
    public static List<string> Wrap(string text, int maxLength)
    {
        var res = new List<string>();
        foreach (var para in text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n'))
        {
            if (maxLength <= 0) { res.Add(para); continue; }
            string cur = "";
            foreach (var word in para.Split(' '))
            {
                string w = word;
                while (VisLen(w) > maxLength)
                {
                    if (cur.Length > 0) { res.Add(cur); cur = ""; }
                    int cnt = 0, pos = 0;
                    while (pos < w.Length && cnt < maxLength) { if (IsVisible(w[pos])) cnt++; pos++; }
                    while (pos < w.Length && IsMark(w[pos])) pos++;
                    res.Add(w.Substring(0, pos));
                    w = w.Substring(pos);
                }
                if (cur.Length == 0) cur = w;
                else if (VisLen(cur) + 1 + VisLen(w) <= maxLength) cur += " " + w;
                else { res.Add(cur); cur = w; }
            }
            res.Add(cur);
        }
        return res;
    }

    static bool IsVisible(char c) { return c != Zwnj && c != Zwj && !IsMark(c); }
    static int VisLen(string s) { int n = 0; foreach (char c in s) if (IsVisible(c)) n++; return n; }
}
