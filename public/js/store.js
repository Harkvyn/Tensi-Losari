/*
 * Data layer. Talks to the REST API over fetch(); every call returns a
 * Promise. Views never touch fetch() directly - if the API shape changes
 * later, only this file needs to change.
 */
var Store = (function () {
  "use strict";

  var API_BASE = "/api";

  function request(method, path, body) {
    return fetch(API_BASE + path, {
      method: method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || "Terjadi kesalahan pada server.");
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  // ---------------- Posyandu ----------------
  function getPosyanduList() { return request("GET", "/posyandu").then(function (d) { return d.posyandu; }); }

  // ---------------- Auth (petugas) ----------------
  function register(payload) { return request("POST", "/auth/register", payload).then(function (d) { return d.petugas; }); }
  function login(payload) { return request("POST", "/auth/login", payload).then(function (d) { return d.petugas; }); }
  function logout() { return request("POST", "/auth/logout"); }
  function me() { return request("GET", "/auth/me").then(function (d) { return d.petugas; }); }

  // ---------------- Patients ----------------
  function getPatients() { return request("GET", "/patients").then(function (d) { return d.patients; }); }
  function getPatient(id) { return request("GET", "/patients/" + id).then(function (d) { return d.patient; }); }
  function addPatient(payload) { return request("POST", "/patients", payload).then(function (d) { return d.patient; }); }
  function updatePatient(id, payload) { return request("PUT", "/patients/" + id, payload).then(function (d) { return d.patient; }); }
  function deletePatient(id) { return request("DELETE", "/patients/" + id); }

  // ---------------- Readings ----------------
  function getReadings(patientId) { return request("GET", "/patients/" + patientId + "/readings").then(function (d) { return d.readings; }); }
  function addReading(patientId, payload) { return request("POST", "/patients/" + patientId + "/readings", payload).then(function (d) { return d.reading; }); }

  // ---------------- Backups ----------------
  function getBackups() { return request("GET", "/backups").then(function (d) { return d.backups; }); }
  function createBackupNow() { return request("POST", "/backups").then(function (d) { return d.filename; }); }
  function backupDownloadUrl(filename) { return API_BASE + "/backups/" + encodeURIComponent(filename) + "/download"; }

  return {
    getPosyanduList: getPosyanduList,
    register: register, login: login, logout: logout, me: me,
    getPatients: getPatients, getPatient: getPatient, addPatient: addPatient,
    updatePatient: updatePatient, deletePatient: deletePatient,
    getReadings: getReadings, addReading: addReading,
    getBackups: getBackups, createBackupNow: createBackupNow, backupDownloadUrl: backupDownloadUrl
  };
})();
