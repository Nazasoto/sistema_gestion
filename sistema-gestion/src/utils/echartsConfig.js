// Configuración optimizada de ECharts - solo importar lo necesario
import * as echarts from 'echarts/core';

// Importar solo los componentes de gráficos que realmente usamos
import { PieChart, LineChart, BarChart } from 'echarts/charts';

// Importar solo los componentes necesarios
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';

// Importar solo el renderizador Canvas (más liviano que SVG)
import { CanvasRenderer } from 'echarts/renderers';

// Registrar los componentes que vamos a usar
echarts.use([
  PieChart,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
]);

export default echarts;
