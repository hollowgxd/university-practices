using System;
using System.Collections.Generic;

namespace RefactoringExample
{
    internal static class UserValidator
    {
        public static bool IsValid(Dictionary<string, object> userData)
        {
            if ((int)userData["age"] < 18)
            {
                Console.WriteLine("User is too young");
                return false;
            }

            if (((string)userData["name"]).Length > 100)
            {
                Console.WriteLine("Name is too long");
                return false;
            }

            return true;
        }
    }
}
