import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
);

// Chart component interfaces
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  [key: string]: any;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    title?: {
      display?: boolean;
      text?: string;
    };
    tooltip?: {
      enabled?: boolean;
      mode?: 'index' | 'dataset' | 'point' | 'nearest';
      intersect?: boolean;
    };
  };
  scales?: {
    [key: string]: {
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
      beginAtZero?: boolean;
      grid?: {
        display?: boolean;
      };
    };
  };
  animation?: {
    duration?: number;
    easing?: string;
  };
}

// Line Chart Component
export const LineChart: React.FC<{
  data: ChartData;
  options?: ChartOptions;
  height?: number;
  className?: string;
}> = ({ data, options = {}, height = 300, className = '' }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const chartRef = React.useRef<ChartJS<'line'> | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new ChartJS(ctx, {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Time',
            },
            grid: {
              display: false,
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Value',
            },
            beginAtZero: true,
            grid: {
              display: true,
            },
          },
        },
        animation: {
          duration: 750,
          easing: 'easeInOutQuart',
        },
        ...options,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, options]);

  return React.createElement('div', { className, style: { height: `${height}px` } },
    React.createElement('canvas', { ref: canvasRef })
  );
};

// Bar Chart Component
export const BarChart: React.FC<{
  data: ChartData;
  options?: ChartOptions;
  height?: number;
  className?: string;
}> = ({ data, options = {}, height = 300, className = '' }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const chartRef = React.useRef<ChartJS<'bar'> | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new ChartJS(ctx, {
      type: 'bar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Category',
            },
            grid: {
              display: false,
            },
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Value',
            },
            beginAtZero: true,
            grid: {
              display: true,
            },
          },
        },
        animation: {
          duration: 750,
          easing: 'easeInOutQuart',
        },
        ...options,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, options]);

  return React.createElement('div', { className, style: { height: `${height}px` } },
    React.createElement('canvas', { ref: canvasRef })
  );
};

// Pie Chart Component
export const PieChart: React.FC<{
  data: ChartData;
  options?: ChartOptions;
  height?: number;
  className?: string;
}> = ({ data, options = {}, height = 300, className = '' }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const chartRef = React.useRef<ChartJS<'pie'> | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new ChartJS(ctx, {
      type: 'pie',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right',
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
          },
        },
        animation: {
          duration: 750,
          easing: 'easeInOutQuart',
        },
        ...options,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, options]);

  return React.createElement('div', { className, style: { height: `${height}px` } },
    React.createElement('canvas', { ref: canvasRef })
  );
};

// Doughnut Chart Component
export const DoughnutChart: React.FC<{
  data: ChartData;
  options?: ChartOptions;
  height?: number;
  className?: string;
}> = ({ data, options = {}, height = 300, className = '' }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const chartRef = React.useRef<ChartJS<'doughnut'> | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new ChartJS(ctx, {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right',
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
          },
        },
        animation: {
          duration: 750,
          easing: 'easeInOutQuart',
        },
        ...options,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, options]);

  return React.createElement('div', { className, style: { height: `${height}px` } },
    React.createElement('canvas', { ref: canvasRef })
  );
};

// Radar Chart Component
export const RadarChart: React.FC<{
  data: ChartData;
  options?: ChartOptions;
  height?: number;
  className?: string;
}> = ({ data, options = {}, height = 300, className = '' }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const chartRef = React.useRef<ChartJS<'radar'> | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new ChartJS(ctx, {
      type: 'radar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          r: {
            display: true,
            beginAtZero: true,
            grid: {
              display: true,
            },
          },
        },
        animation: {
          duration: 750,
          easing: 'easeInOutQuart',
        },
        ...options,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, options]);

  return React.createElement('div', { className, style: { height: `${height}px` } },
    React.createElement('canvas', { ref: canvasRef })
  );
};

// Utility functions for chart data
export const chartUtils = {
  // Generate random colors
  generateColors: (count: number): string[] => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
    ];
    
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  },

  // Format data for charts
  formatTimeSeriesData: (data: any[], labelKey: string, valueKey: string): ChartData => {
    const labels = data.map(item => item[labelKey]);
    const values = data.map(item => item[valueKey]);

    return {
      labels,
      datasets: [{
        label: valueKey,
        data: values,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      }]
    };
  },

  // Format data for pie/doughnut charts
  formatPieData: (data: any[], labelKey: string, valueKey: string): ChartData => {
    const labels = data.map(item => item[labelKey]);
    const values = data.map(item => item[valueKey]);
    const colors = chartUtils.generateColors(data.length);

    return {
      labels,
      datasets: [{
        label: 'Value',
        data: values,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('0.8', '1')),
        borderWidth: 2,
      }]
    };
  },

  // Format data for bar charts
  formatBarData: (data: any[], labelKey: string, valueKey: string): ChartData => {
    const labels = data.map(item => item[labelKey]);
    const values = data.map(item => item[valueKey]);
    const colors = chartUtils.generateColors(data.length);

    return {
      labels,
      datasets: [{
        label: valueKey,
        data: values,
        backgroundColor: colors.map(color => color.replace('1)', '0.8)')),
        borderColor: colors,
        borderWidth: 2,
      }]
    };
  },

  // Format data for radar charts
  formatRadarData: (data: any[], labelKey: string, valueKey: string): ChartData => {
    const labels = data.map(item => item[labelKey]);
    const values = data.map(item => item[valueKey]);

    return {
      labels,
      datasets: [{
        label: valueKey,
        data: values,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 2,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#3B82F6',
      }]
    };
  },
};

export default {
  LineChart,
  BarChart,
  PieChart,
  DoughnutChart,
  RadarChart,
  chartUtils,
};
