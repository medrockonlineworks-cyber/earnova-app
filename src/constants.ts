export enum JobLevel {
  INTERN = 'Intern',
  JOB1 = 'JOB1',
  JOB2 = 'JOB2',
  JOB3 = 'JOB3',
  JOB4 = 'JOB4',
  JOB5 = 'JOB5',
  JOB6 = 'JOB6',
  JOB7 = 'JOB7',
  JOB8 = 'JOB8',
  JOB9 = 'JOB9',
  JOB10 = 'JOB10',
}

export interface Job {
  id: string;
  level: JobLevel;
  deposit: number;
  dailyTasks: number;
  eachOrder: number;
  color: string;
  bgColor: string;
}

export interface Investment {
  id: string;
  name: string;
  term: number;
  dailyProfit: number;
  minDeposit: number;
  color: string;
}

export const JOBS: Job[] = [
  { id: '0', level: JobLevel.INTERN, deposit: 0, dailyTasks: 5, eachOrder: 22, color: 'text-amber-900', bgColor: 'bg-amber-50' },
  { id: '1', level: JobLevel.JOB1, deposit: 4000, dailyTasks: 5, eachOrder: 26, color: 'text-orange-900', bgColor: 'bg-orange-50' },
  { id: '2', level: JobLevel.JOB2, deposit: 10000, dailyTasks: 10, eachOrder: 33, color: 'text-blue-900', bgColor: 'bg-blue-50' },
  { id: '3', level: JobLevel.JOB3, deposit: 30000, dailyTasks: 15, eachOrder: 69, color: 'text-emerald-900', bgColor: 'bg-emerald-50' },
  { id: '4', level: JobLevel.JOB4, deposit: 60000, dailyTasks: 30, eachOrder: 70, color: 'text-rose-900', bgColor: 'bg-rose-50' },
  { id: '5', level: JobLevel.JOB5, deposit: 120000, dailyTasks: 50, eachOrder: 87, color: 'text-sky-900', bgColor: 'bg-sky-50' },
  { id: '6', level: JobLevel.JOB6, deposit: 200000, dailyTasks: 80, eachOrder: 93, color: 'text-purple-900', bgColor: 'bg-purple-50' },
  { id: '7', level: JobLevel.JOB7, deposit: 350000, dailyTasks: 130, eachOrder: 103, color: 'text-indigo-900', bgColor: 'bg-indigo-50' },
  { id: '8', level: JobLevel.JOB8, deposit: 800000, dailyTasks: 200, eachOrder: 160, color: 'text-fuchsia-900', bgColor: 'bg-fuchsia-50' },
  { id: '9', level: JobLevel.JOB9, deposit: 1600000, dailyTasks: 350, eachOrder: 192, color: 'text-pink-900', bgColor: 'bg-pink-50' },
  { id: '10', level: JobLevel.JOB10, deposit: 3200000, dailyTasks: 600, eachOrder: 240, color: 'text-amber-900', bgColor: 'bg-amber-100' },
];

export interface PositionRule {
  position: string;
  teamSize: string;
  monthlySalary: number;
}

export const POSITION_RULES: PositionRule[] = [
  { position: 'Internship Assistant', teamSize: '15 direct reports', monthlySalary: 8000 },
  { position: 'Official Assistant', teamSize: '25 direct reports', monthlySalary: 16000 },
  { position: 'Formal Supervisor', teamSize: '25-150-person team', monthlySalary: 50000 },
  { position: 'Marketing Manager', teamSize: '25-500-person team', monthlySalary: 120000 },
  { position: 'Regional Manager', teamSize: '25-1500-person team', monthlySalary: 250000 },
  { position: 'Marketing Director', teamSize: '25-3500-person team', monthlySalary: 600000 },
  { position: 'Company Partner', teamSize: '25-7000-person team', monthlySalary: 1300000 },
];

export interface CommissionRule {
  level: string;
  ratio: string;
  level1: number | string;
  level2: number | string;
  level3: number | string;
}

export const UP_LEVEL_RULES: CommissionRule[] = [
  { level: 'JOB1', ratio: '12%-4%-2%', level1: 480, level2: 160, level3: 80 },
  { level: 'JOB2', ratio: '12%-4%-2%', level1: 1200, level2: 400, level3: 200 },
  { level: 'JOB3', ratio: '12%-4%-2%', level1: 3600, level2: 1200, level3: 600 },
  { level: 'JOB4', ratio: '12%-4%-2%', level1: 7200, level2: 2400, level3: 1200 },
  { level: 'JOB5', ratio: '12%-4%-2%', level1: 14400, level2: 4800, level3: 2400 },
  { level: 'JOB6', ratio: '12%-4%-2%', level1: 24000, level2: 8000, level3: 4000 },
  { level: 'JOB7', ratio: '12%-4%-2%', level1: 42000, level2: 14000, level3: 7000 },
  { level: 'JOB8', ratio: '12%-4%-2%', level1: 96000, level2: 32000, level3: 16000 },
  { level: 'JOB9', ratio: '12%-4%-2%', level1: 192000, level2: 64000, level3: 32000 },
  { level: 'JOB10', ratio: '12%-4%-2%', level1: 384000, level2: 128000, level3: 64000 },
];

export const TASK_RULES: CommissionRule[] = [
  { level: 'JOB1', ratio: '5%-3%-1%', level1: 6.5, level2: 3.9, level3: 1.3 },
  { level: 'JOB2', ratio: '5%-3%-1%', level1: 16.5, level2: 9.9, level3: 3.3 },
  { level: 'JOB3', ratio: '5%-3%-1%', level1: 51.75, level2: 31.05, level3: 10.35 },
  { level: 'JOB4', ratio: '5%-3%-1%', level1: 105, level2: 63, level3: 21 },
  { level: 'JOB5', ratio: '5%-3%-1%', level1: 216, level2: 129.6, level3: 43.2 },
  { level: 'JOB6', ratio: '5%-3%-1%', level1: 372, level2: 223.2, level3: 74.4 },
  { level: 'JOB7', ratio: '5%-3%-1%', level1: 669.5, level2: 401.7, level3: 133.9 },
  { level: 'JOB8', ratio: '5%-3%-1%', level1: 1600, level2: 960, level3: 320 },
  { level: 'JOB9', ratio: '5%-3%-1%', level1: 3360, level2: 2016, level3: 672 },
  { level: 'JOB10', ratio: '5%-3%-1%', level1: 7200, level2: 4320, level3: 1440 },
];

export const INVESTMENTS: Investment[] = [
  { id: '1', name: 'Wealth Fund 1', term: 7, dailyProfit: 1.5, minDeposit: 1000, color: 'bg-slate-900' },
  { id: '2', name: 'Wealth Fund 2', term: 14, dailyProfit: 3.0, minDeposit: 1000, color: 'bg-blue-600' },
  { id: '3', name: 'Wealth Fund 3', term: 28, dailyProfit: 4.5, minDeposit: 1000, color: 'bg-slate-800' },
  { id: '4', name: 'Wealth Fund 4', term: 56, dailyProfit: 6.0, minDeposit: 1000, color: 'bg-blue-500' },
  { id: '5', name: 'Wealth Fund 5', term: 112, dailyProfit: 7.5, minDeposit: 1000, color: 'bg-indigo-900' },
  { id: '6', name: 'Wealth Fund 6', term: 224, dailyProfit: 9.0, minDeposit: 1000, color: 'bg-blue-700' },
  { id: '7', name: 'Wealth Fund 7', term: 448, dailyProfit: 10.5, minDeposit: 1000, color: 'bg-slate-700' },
  { id: '8', name: 'Wealth Fund 8', term: 896, dailyProfit: 12.0, minDeposit: 1000, color: 'bg-indigo-600' },
  { id: '9', name: 'Wealth Fund 9', term: 1792, dailyProfit: 13.5, minDeposit: 1000, color: 'bg-slate-900' },
  { id: '10', name: 'Wealth Fund 10', term: 3584, dailyProfit: 15.0, minDeposit: 1000, color: 'bg-blue-600' },
];
