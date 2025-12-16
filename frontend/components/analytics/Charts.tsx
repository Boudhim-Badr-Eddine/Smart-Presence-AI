'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AttendanceTrendData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface ClassStatsData {
  className: string;
  attendanceRate: number;
  studentCount: number;
}

interface StudentRiskData {
  name: string;
  riskLevel: number;
  absences: number;
}

interface AnalyticsChartsProps {
  attendanceTrend?: AttendanceTrendData[];
  classStats?: ClassStatsData[];
  highRiskStudents?: StudentRiskData[];
}

const COLORS = {
  primary: '#d97706',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const PIE_COLORS = [COLORS.success, COLORS.warning, COLORS.danger];

export function AttendanceTrendChart({ data }: { data: AttendanceTrendData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-zinc-500">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#fff',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="present"
          stroke={COLORS.success}
          strokeWidth={2}
          name="Présents"
        />
        <Line
          type="monotone"
          dataKey="late"
          stroke={COLORS.warning}
          strokeWidth={2}
          name="En retard"
        />
        <Line
          type="monotone"
          dataKey="absent"
          stroke={COLORS.danger}
          strokeWidth={2}
          name="Absents"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ClassStatsChart({ data }: { data: ClassStatsData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-zinc-500">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="className" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#fff',
          }}
        />
        <Legend />
        <Bar
          dataKey="attendanceRate"
          fill={COLORS.primary}
          name="Taux de présence (%)"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HighRiskStudentsChart({ data }: { data: StudentRiskData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-zinc-500">
        Aucun étudiant à risque
      </div>
    );
  }

  // Take top 10 high-risk students
  const topRisk = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={topRisk} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis type="number" stroke="#9ca3af" />
        <YAxis dataKey="name" type="category" stroke="#9ca3af" width={150} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#fff',
          }}
        />
        <Legend />
        <Bar
          dataKey="absences"
          fill={COLORS.danger}
          name="Nombre d'absences"
          radius={[0, 8, 8, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AttendanceDistributionChart({
  present,
  late,
  absent,
}: {
  present: number;
  late: number;
  absent: number;
}) {
  const data = [
    { name: 'Présents', value: present },
    { name: 'En retard', value: late },
    { name: 'Absents', value: absent },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-zinc-500">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#fff',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
