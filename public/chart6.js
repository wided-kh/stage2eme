var xValues = ["Nombre de visite", "Nombre de retrait", "Clients"];
var yValues = [20, 30, 40];
var barColors = [
  "#b91d47",
  "#2b5797",
  "#e8c3b9"

];

new Chart("doughnut", {
  type: "doughnut",
  data: {
    labels: xValues,
    datasets: [{
      backgroundColor: barColors,
      data: yValues
    }]
  },
  options: {
    title: {
      display: true,
      text: "PME"
    }
  }
});