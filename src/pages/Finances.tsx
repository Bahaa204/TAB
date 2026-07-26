import { useState } from "react";
import { useEmployees } from "../hooks/useEmployees";
import { useHouses } from "../hooks/useHouses";
import { formatDate } from "../helpers/Date";
import type { DateRange, DateString } from "../types/date";
import { useAuth } from "../hooks/useAuth";
import ChartBarInteractive from "@/components/Custom/BarChart";
import type { ChartConfig } from "@/components/ui/chart";
import type { ChartData } from "@/types/chart";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/Custom/DatePickerWithRange";
import Breadcrumbs from "@/components/Breadcrumbs";

import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Finances() {
  useDocumentTitle("Finances");

  const {
    Session,
    Error: AuthError,
    Loading: AuthLoading,
    GetRoleFromEmail,
  } = useAuth();

  const {
    Error: HousesError,
    Loading: HousesLoading,
    getDates,
    getHousesBetweenDates,
  } = useHouses();

  const navigate = useNavigate();

  const { minInputDate, maxInputDate } = getDates();

  const [SelectedMinDate, setSelectedMinDate] = useState<DateString | null>(
    null,
  );
  const [SelectedMaxDate, setSelectedMaxDate] = useState<DateString | null>(
    null,
  );
  const [Income, setIncome] = useState<number>(0);
  const [Calculating, setCalculating] = useState<string>("");
  const [ChartData, setChartData] = useState<ChartData[]>([]);

  const MinDate = SelectedMinDate ?? minInputDate;
  const MaxDate = SelectedMaxDate ?? maxInputDate;

  const {
    Error: EmployeesError,
    Loading: EmployeesLoading,
    getSalaries,
  } = useEmployees();

  const loading = EmployeesLoading || HousesLoading || AuthLoading;
  const error = EmployeesError || HousesError?.message || AuthError;

  if (error) {
    return (
      <main className="min-h-screen bg-[#e6e0d8] p-4 md:p-8">
        <Card className="mx-auto max-w-3xl border border-[#c8b9a7] bg-white text-[#0f2f4f] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-[#0f2f4f]">
              Finances Error
            </CardTitle>
            <CardDescription className="text-[#24507f]">
              We could not load finances data.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-[#173b67]">{error}</CardContent>
        </Card>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#e6e0d8] p-4 md:p-8">
        <Card className="mx-auto max-w-3xl border border-[#c8b9a7] bg-white text-[#0f2f4f] shadow-lg">
          <CardContent className="flex items-center justify-center gap-3 py-8 text-[#173b67]">
            <Spinner className="size-5 text-[#173b67]" />
            <span>Loading Data...</span>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!Session || GetRoleFromEmail(Session.user.email) !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5">
        <p className="text-lg text-[#10243e]">
          You must be logged in as an admin to access this page.
        </p>
        <Button
          variant="link"
          className="cursor-pointer text-lg"
          onClick={() => navigate("/login")}
        >
          Navigate to Login
        </Button>
      </div>
    );
  }

  async function handleClick() {
    if (Calculating) return;

    setCalculating("Calculating...");
    if (new Date(MinDate) > new Date(MaxDate)) {
      alert("Start date must be before end date.");
      setCalculating("");
      return;
    }

    // console.log("Min Date: ", MinDate);
    // console.log("Max Date: ", MaxDate);

    const houses = await getHousesBetweenDates(MinDate, MaxDate);

    console.log("Houses between dates: ", houses);

    if (!houses || houses.length === 0) {
      setIncome(0);
      alert(`No Houses were added during ${MinDate} and ${MaxDate}`);
      setCalculating("");
      return;
    }

    const income = houses.reduce(
      (sum, house) => (sum += house.is_sold ? house.price : 0),
      0,
    );

    console.log("Income: ", income);

    setIncome(income);

    const chartData = await ConstructChartData(MinDate, MaxDate);
    setChartData(chartData);

    setCalculating("");
  }

  function handleDateRangeChange(range: DateRange) {
    setSelectedMinDate(range.minDate);
    setSelectedMaxDate(range.maxDate);
  }

  const chartConfig = {
    views: {
      label: "Finances",
    },
    profit: {
      label: "Total Profit",
      color: "#f3a342",
    },
    income: {
      label: "Total Income",
      color: "#24507f",
    },
    expenses: {
      label: "Total Expenses",
      color: "#e58f1e",
    },
  } satisfies ChartConfig;

  async function ConstructChartData(minDate: DateString, maxDate: DateString) {
    const data: ChartData[] = [];

    const currentDate = new Date(minDate);
    const endDate = new Date(maxDate);
    const expenses = getSalaries();

    setCalculating("Generating Chart Data...");

    while (currentDate <= endDate) {
      // console.log("Current Date: ", currentDate);

      const formattedDate = formatDate(currentDate);

      const houses = await getHousesBetweenDates(formattedDate, formattedDate);

      console.log("House: ", houses);

      const income = houses.reduce(
        (sum, house) => (sum += house.is_sold ? house.price : 0),
        0,
      );

      const part: ChartData = {
        date: formattedDate,
        profit: income - expenses,
        income: income,
        expenses: expenses,
      };

      console.log(part);

      data.push(part);

      currentDate.setDate(currentDate.getDate() + 1);
      // console.log("Moved to the next Day");
    }

    return data;
  }

  const expenses = getSalaries();
  const profit = Income - expenses;

  return (
    <div className="min-h-screen bg-[#e6e0d8] px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs />
      <div className="mx-auto w-full">
        <Card className="rounded-[2rem] bg-[linear-gradient(135deg,#10243e,#17365d_65%,#bf530a)] px-8 py-10 text-white shadow-xl">
          <CardHeader>
            <CardTitle>
              <p className="  -3 text-sm uppercase tracking-[0.3em] text-[#ffe0c2]">
                Admin workspace
              </p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Finances
              </h1>
            </CardTitle>
            <CardDescription className="mt-4 max-w-2xl text-sm leading-6 text-[#d9e4f0] sm:text-base">
              View Income, Expenses, and Profits over a period of time
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="grid gap-4 p-5 md:grid-cols-3 mt-5 mb-5 bg-transparent ring-0!">
          <Card className="rounded-3xl border border-[#ffd2ad] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f2_100%)] p-5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-[#5f7490]">
                Core actions
              </CardTitle>
              <CardDescription className="mt-2 text-lg font-semibold text-[#10243e]">
                View Income, Expenses, and Profits over a period of time
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-3xl border border-[#ffd2ad] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f2_100%)] p-5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-[#5f7490]">
                Data source
              </CardTitle>
              <CardDescription className="mt-2 text-lg font-semibold text-[#10243e]">
                Synced with the Database
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-3xl border border-[#ffd2ad] bg-[linear-gradient(180deg,#ffffff_0%,#fff8f2_100%)] p-5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-[#5f7490]">
                Editing style
              </CardTitle>
              <CardDescription className="mt-2 text-lg font-semibold text-[#10243e]">
                Inline updates with instant refresh
              </CardDescription>
            </CardHeader>
          </Card>
        </Card>

        <Card className="bg-transparent ring-0! p-0!">
          <CardContent className="space-y-6">
            <Card className="p-5">
              <Card className="mx-auto w-full max-w-xl rounded-xl border border-[#d2c5b7] bg-[#fff9f2] p-4">
                <CardHeader>
                  <CardTitle className="text-[#0f2f4f]">Select Dates</CardTitle>
                  <CardDescription className="text-[#24507f]">
                    Pick a start and end date to calculate financial totals.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DatePickerWithRange
                    label="Select Dates"
                    minDate={minInputDate}
                    maxDate={maxInputDate}
                    selectedMinDate={MinDate}
                    selectedMaxDate={MaxDate}
                    onDateRangeChange={handleDateRangeChange}
                    pickerBackgroundColor="#fffdf8"
                    pickerTextColor="#0f2f4f"
                  />
                </CardContent>
              </Card>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card className="border border-[#d2c5b7] bg-[#fff9f2] text-center">
                  <CardContent className="py-6">
                    <h3 className="text-lg font-semibold text-[#173b67]">
                      Income
                    </h3>
                    <p className="mt-2 text-2xl font-bold text-[#0f2f4f]">
                      {Income.toLocaleString()}$
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-[#f3a342]/60 bg-[#fff4e5] text-center">
                  <CardContent className="py-6">
                    <h3 className="text-lg font-semibold text-[#173b67]">
                      Profit
                    </h3>
                    <p className="mt-2 text-2xl font-bold text-[#0f2f4f]">
                      {profit < 0 ? 0 : profit.toLocaleString()}$
                    </p>
                  </CardContent>
                </Card>
                <Card className="border border-[#d2c5b7] bg-[#fff9f2] text-center">
                  <CardContent className="py-6">
                    <h3 className="text-lg font-semibold text-[#173b67]">
                      Expenses
                    </h3>
                    <p className="mt-2 text-2xl font-bold text-[#0f2f4f]">
                      {expenses.toLocaleString()}$
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  onClick={handleClick}
                  disabled={Calculating !== ""}
                  className="h-12 cursor-pointer rounded-xl bg-[#0f2f4f] px-10 text-base text-white transition hover:bg-[#173b67] disabled:cursor-not-allowed disabled:bg-[#6b7f95] disabled:opacity-80"
                >
                  {Calculating ? (
                    <>
                      <Spinner className="size-5" />
                      {Calculating}
                    </>
                  ) : (
                    "Calculate Finances"
                  )}
                </Button>
              </div>
            </Card>

            <Card className="rounded-2xl p-5">
              <ChartBarInteractive
                title="Finances"
                description="Showing finances between the selected time frames"
                data={ChartData}
                config={chartConfig}
              />
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
