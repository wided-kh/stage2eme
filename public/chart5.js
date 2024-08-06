var xValues = ["Clients", "Soldes", "Activité"];
var yValues = [30, 30, 40];
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
      text: "VR LAND"
    }
  }
});