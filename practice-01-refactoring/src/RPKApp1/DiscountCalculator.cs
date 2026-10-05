namespace RefactoringExample
{
    internal static class DiscountCalculator
    {
        public static double Calculate(bool isVip, int orders)
        {
            if (isVip)
            {
                return 0.15;
            }

            return orders > 5 ? 0.1 : 0;
        }
    }
}
