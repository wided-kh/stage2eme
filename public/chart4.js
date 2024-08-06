var xValues = ["Clients", "Nombre de visite", "Nombre de retrait"];
var yValues = [55, 49, 44];
var barColors = ["pink","#b91d47","#2b5797"];

new Chart("barchart", {
  type: "bar",
  data: {
    labels: xValues,
    datasets: [{
      backgroundColor: barColors,
      data: yValues
    }]
  },
  options: {
    legend: {display: false},
    title: {
      display: true,
      text: "PME"
    }
  }
});