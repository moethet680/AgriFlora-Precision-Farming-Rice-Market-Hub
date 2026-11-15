"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  demand: { label: "ဝယ်လိုအား (Demand)", color: "var(--chart-1)" },
  supply: { label: "ရောင်းလိုအား (Supply)", color: "var(--chart-2)" },
}

export function SupplyDemandBarChart() {
  // Real Data များကို သိမ်းဆည်းရန် State များ
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Python Backend API ထံမှ ဒေတာလှမ်းတောင်းခြင်း
    fetch("http://127.0.0.1:5000/api/supply-demand")
      .then((res) => {
        if (!res.ok) {
          throw new Error("ဒေတာဆွဲယူရယူခြင်း မအောင်မြင်ပါ")
        }
        return res.json()
      })
      .then((data) => {
        setChartData(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching supply-demand data:", err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // ဒေတာဆွဲနေတုန်း ပြသမည့် Loading Screen
  if (loading) {
    return (
      <div className="h-[260px] w-full flex items-center justify-center text-sm text-muted-foreground">
        <span>🔄 ဝယ်လိုအားနှင့် ရောင်းလိုအား ဒေတာများ ဆွဲယူနေပါသည်...</span>
      </div>
    )
  }

  // Error တက်ခဲ့လျှင် ပြသမည့်မျက်နှာပြင်
  if (error) {
    return (
      <div className="h-[260px] w-full flex items-center justify-center text-sm text-destructive">
        <span>⚠️ ဒေတာချိတ်ဆက်မှု ချို့ယွင်းနေပါသည် ({error})</span>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      {/* Backend ကလာမယ့် chartData ကို data အဖြစ် ထည့်သွင်းထားပါတယ် */}
      <BarChart data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${v}ထ`} // တန်ချိန် ထောင်ဂဏန်းအဖြစ် ပြသရန်
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => [
                `${Number(value).toLocaleString()} တန်`,
                name === "demand" ? " ဝယ်လိုအား" : " ရောင်းလိုအား",
              ]}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="demand"
          fill="var(--color-demand)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="supply"
          fill="var(--color-supply)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ChartContainer>
  )
}