const ctx = document.getElementById('lineChart');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',' juillet','Août','Septembre','Octobre','Novembre','Décembre'],
      datasets: [{
        label: 'Solde ',
        data: [2024, 2025, 2026, 2027, 2028, 2029],
        borderWidth: 1
      }]
    },
    options: {
      responsive:true
    }
  });