using System;
using System.Collections.Generic;
using System.Text.Json;

namespace RefactoringExample
{
    public class Program
    {
        private static readonly List<Dictionary<string, object>> Users = new();

        private static readonly Dictionary<string, object> Config = new()
        {
            { "reportType", "detailed" }
        };

        public static void ProcessUser(Dictionary<string, object> userData)
        {
            if (!UserValidator.IsValid(userData))
            {
                return;
            }

            double discount = DiscountCalculator.Calculate(
                (bool)userData["isVIP"],
                (int)userData["orders"]);

            Dictionary<string, object> user = CreateUserRecord(userData, discount);
            SaveUser(user);

            ReportGenerator.Generate(
                (string)user["name"],
                (int)user["age"],
                (double)user["discount"],
                (bool)user["isActive"],
                DateTime.Now,
                (string)Config["reportType"]);
        }

        private static Dictionary<string, object> CreateUserRecord(
            Dictionary<string, object> userData,
            double discount)
        {
            return new Dictionary<string, object>
            {
                { "name", userData["name"] },
                { "age", userData["age"] },
                { "discount", discount },
                { "isActive", true }
            };
        }

        private static void SaveUser(Dictionary<string, object> user)
        {
            Users.Add(user);
            Console.WriteLine("User saved: " + JsonSerializer.Serialize(user));
        }

        // Сохраняем исходный публичный метод как точку входа для существующего кода.
        public static void GenerateReport(string name, int age, double discount,
            bool isActive, DateTime reportDate, string reportType)
        {
            ReportGenerator.Generate(name, age, discount, isActive, reportDate, reportType);
        }

        // Сохраняем исходный публичный метод и делегируем расчёт специализированному классу.
        public static double CalculateDiscount(bool isVip, int orders)
        {
            return DiscountCalculator.Calculate(isVip, orders);
        }

        static void Main(string[] args)
        {
            var userData = new Dictionary<string, object>
            {
                { "name", "John Doe" },
                { "age", 25 },
                { "isVIP", true },
                { "orders", 10 }
            };

            ProcessUser(userData);

            double discount = CalculateDiscount(true, 10);
            Console.WriteLine("Calculated discount: " + discount);
        }
    }
}
