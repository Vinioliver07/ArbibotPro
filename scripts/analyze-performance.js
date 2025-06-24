const fs = require('fs');
const path = require('path');

console.log('📊 Analisando performance do ArbiBot Pro...\n');

class PerformanceAnalyzer {
  constructor() {
    this.logsDir = 'logs';
    this.performanceFile = path.join(this.logsDir, 'performance-test-results.json');
    this.arbitrageLogs = [];
    this.performanceData = {};
  }

  async analyze() {
    try {
      // Carregar dados de performance
      await this.loadPerformanceData();
      
      // Carregar logs de arbitragem
      await this.loadArbitrageLogs();
      
      // Gerar análises
      this.analyzeGasUsage();
      this.analyzeExecutionTimes();
      this.analyzeSuccessRates();
      this.analyzeProfitability();
      this.generateRecommendations();
      
      // Salvar relatório
      this.saveReport();
      
      console.log('✅ Análise de performance concluída!');
      
    } catch (error) {
      console.error('❌ Erro na análise:', error.message);
    }
  }

  async loadPerformanceData() {
    if (fs.existsSync(this.performanceFile)) {
      const data = fs.readFileSync(this.performanceFile, 'utf8');
      this.performanceData = JSON.parse(data);
      console.log(`📁 Carregados ${this.performanceData.length} registros de performance`);
    } else {
      console.log('⚠️ Arquivo de performance não encontrado. Execute os testes primeiro.');
    }
  }

  async loadArbitrageLogs() {
    if (!fs.existsSync(this.logsDir)) {
      console.log('⚠️ Diretório de logs não encontrado');
      return;
    }

    const logFiles = fs.readdirSync(this.logsDir)
      .filter(file => file.startsWith('arbitrage-') && file.endsWith('.json'));

    for (const file of logFiles) {
      try {
        const filePath = path.join(this.logsDir, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const logs = JSON.parse(data);
        this.arbitrageLogs.push(...logs);
      } catch (error) {
        console.log(`⚠️ Erro ao carregar ${file}:`, error.message);
      }
    }

    console.log(`📁 Carregados ${this.arbitrageLogs.length} logs de arbitragem`);
  }

  analyzeGasUsage() {
    console.log('\n🔹 ANÁLISE DE USO DE GAS');
    console.log('─'.repeat(40));

    if (this.performanceData.length === 0) return;

    const gasTests = this.performanceData.filter(test => 
      test.data.gasUsed && test.testName.includes('gas')
    );

    if (gasTests.length === 0) {
      console.log('Nenhum dado de gas encontrado');
      return;
    }

    gasTests.forEach(test => {
      console.log(`▸ ${test.testName}:`);
      console.log(`  Gas usado: ${test.data.gasUsed}`);
      console.log(`  Custo: ${test.data.gasCost} ETH`);
      console.log(`  Tempo: ${test.data.executionTime?.toFixed(2)}ms`);
    });

    // Calcular médias
    const totalGas = gasTests.reduce((sum, test) => 
      sum + parseInt(test.data.gasUsed), 0
    );
    const avgGas = totalGas / gasTests.length;
    
    console.log(`\n📊 Resumo Gas:`);
    console.log(`  Uso médio: ${Math.round(avgGas).toLocaleString()} gas`);
    console.log(`  Total analisado: ${totalGas.toLocaleString()} gas`);

    // Verificar eficiência
    if (avgGas > 500000) {
      console.log('⚠️ Alto uso de gas detectado - considere otimizações');
    } else if (avgGas < 200000) {
      console.log('✅ Uso de gas eficiente');
    }
  }

  analyzeExecutionTimes() {
    console.log('\n🔹 ANÁLISE DE TEMPOS DE EXECUÇÃO');
    console.log('─'.repeat(40));

    const timeTests = this.performanceData.filter(test => 
      test.data.averageTime || test.data.executionTime
    );

    if (timeTests.length === 0) {
      console.log('Nenhum dado de tempo encontrado');
      return;
    }

    const timesByCategory = {};
    
    timeTests.forEach(test => {
      const category = test.testName.split(' ')[0];
      if (!timesByCategory[category]) {
        timesByCategory[category] = [];
      }
      
      const time = test.data.averageTime || test.data.executionTime;
      timesByCategory[category].push(time);
    });

    Object.keys(timesByCategory).forEach(category => {
      const times = timesByCategory[category];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);

      console.log(`▸ ${category}:`);
      console.log(`  Tempo médio: ${avg.toFixed(2)}ms`);
      console.log(`  Máximo: ${max.toFixed(2)}ms`);
      console.log(`  Mínimo: ${min.toFixed(2)}ms`);
      
      // Avaliar performance
      if (avg > 100) {
        console.log('  🔴 Lento - precisa otimização');
      } else if (avg > 50) {
        console.log('  🟡 Moderado - monitorar');
      } else {
        console.log('  🟢 Rápido - boa performance');
      }
    });
  }

  analyzeSuccessRates() {
    console.log('\n🔹 ANÁLISE DE TAXA DE SUCESSO');
    console.log('─'.repeat(40));

    if (this.arbitrageLogs.length === 0) {
      console.log('Nenhum log de arbitragem encontrado');
      return;
    }

    const totalOperations = this.arbitrageLogs.length;
    const successfulOperations = this.arbitrageLogs.filter(log => 
      log.status === 'success'
    ).length;
    const failedOperations = this.arbitrageLogs.filter(log => 
      log.status === 'failed'
    ).length;
    const timeoutOperations = this.arbitrageLogs.filter(log => 
      log.status === 'timeout'
    ).length;

    const successRate = (successfulOperations / totalOperations) * 100;

    console.log(`📈 Estatísticas Gerais:`);
    console.log(`  Total de operações: ${totalOperations}`);
    console.log(`  Sucessos: ${successfulOperations} (${successRate.toFixed(1)}%)`);
    console.log(`  Falhas: ${failedOperations}`);
    console.log(`  Timeouts: ${timeoutOperations}`);

    // Análise por motivo de falha
    const failures = this.arbitrageLogs.filter(log => log.status === 'failed');
    if (failures.length > 0) {
      console.log(`\n🔍 Principais motivos de falha:`);
      const failureReasons = {};
      failures.forEach(log => {
        const reason = log.reason || log.error || 'Unknown';
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      });

      Object.entries(failureReasons)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([reason, count]) => {
          console.log(`  ▸ ${reason}: ${count} vezes`);
        });
    }

    // Avaliação da taxa de sucesso
    if (successRate >= 90) {
      console.log('🟢 Excelente taxa de sucesso');
    } else if (successRate >= 75) {
      console.log('🟡 Boa taxa de sucesso');
    } else if (successRate >= 50) {
      console.log('🟠 Taxa de sucesso moderada - investigar falhas');
    } else {
      console.log('🔴 Taxa de sucesso baixa - ação necessária');
    }
  }

  analyzeProfitability() {
    console.log('\n🔹 ANÁLISE DE RENTABILIDADE');
    console.log('─'.repeat(40));

    const profitableLogs = this.arbitrageLogs.filter(log => 
      log.status === 'success' && log.params?.expectedProfit
    );

    if (profitableLogs.length === 0) {
      console.log('Nenhum dado de lucro encontrado');
      return;
    }

    let totalProfit = 0;
    let totalGasCost = 0;
    const profits = [];

    profitableLogs.forEach(log => {
      const profit = parseFloat(log.params.expectedProfit || 0);
      const gasCost = parseFloat(log.gasCost || 0);
      
      profits.push(profit);
      totalProfit += profit;
      totalGasCost += gasCost;
    });

    const avgProfit = totalProfit / profitableLogs.length;
    const netProfit = totalProfit - totalGasCost;
    const profitMargin = ((netProfit / totalProfit) * 100);

    console.log(`💰 Estatísticas de Lucro:`);
    console.log(`  Operações lucrativas: ${profitableLogs.length}`);
    console.log(`  Lucro total bruto: ${totalProfit.toFixed(6)} ETH`);
    console.log(`  Custo total de gas: ${totalGasCost.toFixed(6)} ETH`);
    console.log(`  Lucro líquido: ${netProfit.toFixed(6)} ETH`);
    console.log(`  Lucro médio por operação: ${avgProfit.toFixed(6)} ETH`);
    console.log(`  Margem de lucro: ${profitMargin.toFixed(2)}%`);

    // Análise de distribuição de lucros
    profits.sort((a, b) => b - a);
    const maxProfit = profits[0];
    const minProfit = profits[profits.length - 1];
    const medianProfit = profits[Math.floor(profits.length / 2)];

    console.log(`\n📊 Distribuição de Lucros:`);
    console.log(`  Maior lucro: ${maxProfit?.toFixed(6)} ETH`);
    console.log(`  Menor lucro: ${minProfit?.toFixed(6)} ETH`);
    console.log(`  Lucro mediano: ${medianProfit?.toFixed(6)} ETH`);

    // Avaliação da rentabilidade
    if (profitMargin >= 80) {
      console.log('🟢 Excelente rentabilidade');
    } else if (profitMargin >= 60) {
      console.log('🟡 Boa rentabilidade');
    } else if (profitMargin >= 30) {
      console.log('🟠 Rentabilidade moderada');
    } else {
      console.log('🔴 Baixa rentabilidade - revisar estratégia');
    }
  }

  generateRecommendations() {
    console.log('\n🔹 RECOMENDAÇÕES DE OTIMIZAÇÃO');
    console.log('─'.repeat(40));

    const recommendations = [];

    // Análise de gas
    const gasTests = this.performanceData.filter(test => test.data.gasUsed);
    if (gasTests.length > 0) {
      const avgGas = gasTests.reduce((sum, test) => 
        sum + parseInt(test.data.gasUsed), 0
      ) / gasTests.length;

      if (avgGas > 400000) {
        recommendations.push({
          priority: 'Alta',
          category: 'Gas',
          issue: 'Alto consumo de gas detectado',
          solution: 'Otimizar contratos, reduzir operações desnecessárias'
        });
      }
    }

    // Análise de tempo
    const timeTests = this.performanceData.filter(test => test.data.averageTime);
    if (timeTests.length > 0) {
      const slowTests = timeTests.filter(test => test.data.averageTime > 50);
      if (slowTests.length > 0) {
        recommendations.push({
          priority: 'Média',
          category: 'Performance',
          issue: 'Operações lentas detectadas',
          solution: 'Implementar cache, otimizar consultas'
        });
      }
    }

    // Análise de taxa de sucesso
    if (this.arbitrageLogs.length > 0) {
      const successRate = (this.arbitrageLogs.filter(log => 
        log.status === 'success'
      ).length / this.arbitrageLogs.length) * 100;

      if (successRate < 75) {
        recommendations.push({
          priority: 'Alta',
          category: 'Confiabilidade',
          issue: 'Taxa de sucesso baixa',
          solution: 'Melhorar validação de parâmetros, implementar retry logic'
        });
      }
    }

    // Recomendações gerais
    recommendations.push(
      {
        priority: 'Baixa',
        category: 'Monitoramento',
        issue: 'Monitoramento contínuo',
        solution: 'Implementar alertas automáticos para métricas críticas'
      },
      {
        priority: 'Média',
        category: 'Backup',
        issue: 'Proteção de dados',
        solution: 'Configurar backup automático de logs e configurações'
      }
    );

    // Exibir recomendações por prioridade
    ['Alta', 'Média', 'Baixa'].forEach(priority => {
      const priorityRecs = recommendations.filter(r => r.priority === priority);
      if (priorityRecs.length > 0) {
        console.log(`\n🔸 Prioridade ${priority}:`);
        priorityRecs.forEach((rec, index) => {
          console.log(`  ${index + 1}. [${rec.category}] ${rec.issue}`);
          console.log(`     💡 ${rec.solution}`);
        });
      }
    });

    return recommendations;
  }

  saveReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        performanceTests: this.performanceData.length,
        arbitrageLogs: this.arbitrageLogs.length,
        analysisVersion: '1.0.0'
      },
      gasAnalysis: this.getGasSummary(),
      timeAnalysis: this.getTimeSummary(),
      successAnalysis: this.getSuccessSummary(),
      profitAnalysis: this.getProfitSummary(),
      recommendations: this.generateRecommendations()
    };

    const reportFile = path.join(this.logsDir, `performance-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Relatório salvo em: ${reportFile}`);
  }

  getGasSummary() {
    const gasTests = this.performanceData.filter(test => test.data.gasUsed);
    if (gasTests.length === 0) return null;

    const totalGas = gasTests.reduce((sum, test) => 
      sum + parseInt(test.data.gasUsed), 0
    );
    return {
      totalTests: gasTests.length,
      averageGas: Math.round(totalGas / gasTests.length),
      totalGas
    };
  }

  getTimeSummary() {
    const timeTests = this.performanceData.filter(test => 
      test.data.averageTime || test.data.executionTime
    );
    if (timeTests.length === 0) return null;

    const times = timeTests.map(test => 
      test.data.averageTime || test.data.executionTime
    );
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    return {
      totalTests: timeTests.length,
      averageTime: avgTime,
      maxTime: Math.max(...times),
      minTime: Math.min(...times)
    };
  }

  getSuccessSummary() {
    if (this.arbitrageLogs.length === 0) return null;

    const successful = this.arbitrageLogs.filter(log => log.status === 'success').length;
    const failed = this.arbitrageLogs.filter(log => log.status === 'failed').length;
    const timeout = this.arbitrageLogs.filter(log => log.status === 'timeout').length;

    return {
      total: this.arbitrageLogs.length,
      successful,
      failed,
      timeout,
      successRate: (successful / this.arbitrageLogs.length) * 100
    };
  }

  getProfitSummary() {
    const profitableLogs = this.arbitrageLogs.filter(log => 
      log.status === 'success' && log.params?.expectedProfit
    );
    
    if (profitableLogs.length === 0) return null;

    const totalProfit = profitableLogs.reduce((sum, log) => 
      sum + parseFloat(log.params.expectedProfit || 0), 0
    );
    const totalGasCost = profitableLogs.reduce((sum, log) => 
      sum + parseFloat(log.gasCost || 0), 0
    );

    return {
      totalOperations: profitableLogs.length,
      totalProfit,
      totalGasCost,
      netProfit: totalProfit - totalGasCost,
      averageProfit: totalProfit / profitableLogs.length,
      profitMargin: ((totalProfit - totalGasCost) / totalProfit) * 100
    };
  }
}

// Executar análise
const analyzer = new PerformanceAnalyzer();
analyzer.analyze();