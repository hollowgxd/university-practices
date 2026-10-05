using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace Practice02;

public static class DuplicateFinder
{
    /// <summary>
    /// Returns each value that occurs more than once, preserving the order
    /// in which a value is encountered for the second time.
    /// </summary>
    public static List<int> FindDuplicates(int[] values)
    {
        ArgumentNullException.ThrowIfNull(values);

        var seenValues = new HashSet<int>();
        var reportedDuplicates = new HashSet<int>();
        var duplicates = new List<int>();

        foreach (int value in values)
        {
            if (!seenValues.Add(value) && reportedDuplicates.Add(value))
            {
                duplicates.Add(value);
            }
        }

        return duplicates;
    }
}

public static class Program
{
    public static void Main()
    {
        int[] testArray = { 1, 2, 3, 2, 4, 5, 5, 6 };
        Stopwatch stopwatch = Stopwatch.StartNew();
        List<int> duplicates = DuplicateFinder.FindDuplicates(testArray);
        stopwatch.Stop();

        Console.WriteLine("Дубликаты: " + string.Join(", ", duplicates));
        Console.WriteLine("Время: " + stopwatch.ElapsedTicks + " тиков");
    }
}
