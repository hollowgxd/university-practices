// вариант 1: поиск дубликатов в массиве

using System;
using System.Collections.Generic;
using System.Diagnostics;

class Program
{
    static List<int> FindDuplicates(int[] arr)
    {
        List<int> duplicates = new List<int>();
        for (int i = 0; i < arr.Length; i++)
        {
            for (int j = i + 1; j < arr.Length; j++)
            {
                if (arr[i] == arr[j] && !duplicates.Contains(arr[i]))
                {
                    duplicates.Add(arr[i]);
                }
            }
        }
        return duplicates;
    }

    static void Main()
    {
        int[] testArray = { 1, 2, 3, 2, 4, 5, 5, 6 };
        Stopwatch sw = Stopwatch.StartNew();
        List<int> duplicates = FindDuplicates(testArray);
        sw.Stop();
        Console.WriteLine("Дубликаты: " + string.Join(", ", duplicates));
        Console.WriteLine("Время: " + sw.ElapsedTicks + " тиков");
    }
}