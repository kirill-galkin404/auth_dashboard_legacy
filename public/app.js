var app = angular.module('legacyApp', ['ngRoute']);

app.config(function ($routeProvider) {
  $routeProvider
    .when('/login', { templateUrl: 'login.html', controller: 'LoginCtrl' })
    .when('/dashboard', { templateUrl: 'dashboard.html', controller: 'DashboardCtrl' })
    .otherwise({ redirectTo: '/login' });
});

app.controller('LoginCtrl', function ($scope, $http, $location) {
  $scope.username = '';
  $scope.password = '';
  $scope.error = '';

  $scope.login = function () {
    $http.post('/api/login', { username: $scope.username, password: $scope.password })
      .then(function () {
        $location.path('/dashboard');
      })
      .catch(function () {
        $scope.error = 'Invalid username or password';
      });
  };
});

app.controller('DashboardCtrl', function ($scope, $http, $location) {
  $scope.data = null;

  $http.get('/api/me').then(function (res) {
    $scope.user = res.data.username;
    loadDashboard();
  }).catch(function () {
    $location.path('/login');
  });

  function loadDashboard() {
    $http.get('/api/dashboard').then(function (res) {
      $scope.data = res.data;
    });
  }

  $scope.refresh = loadDashboard;

  $scope.logout = function () {
    $http.post('/api/logout').then(function () {
      $location.path('/login');
    });
  };
});
