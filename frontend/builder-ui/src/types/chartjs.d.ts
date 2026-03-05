declare module 'chart.js' {
  export const CategoryScale: any;
  export const LinearScale: any;
  export const PointElement: any;
  export const LineElement: any;
  export const BarElement: any;
  export const Title: any;
  export const Tooltip: any;
  export const Legend: any;
  export const ArcElement: any;
  export const RadialLinearScale: any;
  export const Filler: any;

  export class Chart<TType = any> {
    static register(...components: any[]): void;
    constructor(ctx: any, config: any);
    destroy(): void;
  }

  export { Chart as ChartJS };
}
