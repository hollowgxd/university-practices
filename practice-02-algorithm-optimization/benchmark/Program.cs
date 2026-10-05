using System.Diagnostics;
using Practice02;

const int WarmupRuns = 2;
const int MeasuredRuns = 7;
int[] inputSizes = { 1_000, 3_000, 6_000, 12_000, 24_000 };

RunCorrectnessChecks();
Console.WriteLine("n,naive_ms,optimized_ms,speedup,results_equal");

foreach (int size in inputSizes)
{
    int[] input = CreateBenchmarkInput(size);

    List<int> expected = FindDuplicatesNaive(input);
    List<int> actual = DuplicateFinder.FindDuplicates(input);
    bool resultsEqual = expected.SequenceEqual(actual);

    double naiveMs = MeasureMilliseconds(() => FindDuplicatesNaive(input));
    double optimizedMs = MeasureMilliseconds(() => DuplicateFinder.FindDuplicates(input));
    double speedup = naiveMs / optimizedMs;

    Console.WriteLine($"{size},{naiveMs:F3},{optimizedMs:F3},{speedup:F1}x,{resultsEqual}");
}


static void RunCorrectnessChecks()
{
    int[][] cases =
    {
        Array.Empty<int>(),
        new[] { 1, 2, 3 },
        new[] { 1, 2, 1, 2, 1 },
        new[] { -1, 0, -1, 2, 0, 2 },
        new[] { 7, 7, 7, 7 }
    };

    foreach (int[] testCase in cases)
    {
        List<int> expected = FindDuplicatesNaive(testCase);
        List<int> actual = DuplicateFinder.FindDuplicates(testCase);
        if (!expected.SequenceEqual(actual))
        {
            throw new InvalidOperationException("Алгоритмы вернули разные результаты.");
        }
    }
}

static int[] CreateBenchmarkInput(int size)
{
    // Every value occurs twice. This creates a predictable duplicate workload
    // while keeping the result order deterministic.
    int[] input = new int[size];
    int distinctValues = size / 2;

    for (int i = 0; i < size; i++)
    {
        input[i] = i % distinctValues;
    }

    return input;
}

static List<int> FindDuplicatesNaive(int[] values)
{
    var duplicates = new List<int>();

    for (int i = 0; i < values.Length; i++)
    {
        for (int j = i + 1; j < values.Length; j++)
        {
            if (values[i] == values[j] && !duplicates.Contains(values[i]))
            {
                duplicates.Add(values[i]);
            }
        }
    }

    return duplicates;
}

static double MeasureMilliseconds(Func<List<int>> algorithm)
{
    for (int i = 0; i < WarmupRuns; i++)
    {
        _ = algorithm();
    }

    var measurements = new List<long>(MeasuredRuns);
    for (int i = 0; i < MeasuredRuns; i++)
    {
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();

        Stopwatch stopwatch = Stopwatch.StartNew();
        _ = algorithm();
        stopwatch.Stop();
        measurements.Add(stopwatch.ElapsedTicks);
    }

    measurements.Sort();
    long medianTicks = measurements[measurements.Count / 2];
    return medianTicks * 1000.0 / Stopwatch.Frequency;
}
