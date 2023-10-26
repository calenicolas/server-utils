'use strict'
const readFile = require('./read_file');
const writeFile = require('./write_file');
const runCommand = require('./run_command');

const instancesFileName = "/root/deploy-service/deploy/instances.json";

function deploy(jsonData, done = () => {}) {
    console.log("Deploying:", jsonData);

    const parameters = getParameters(jsonData);

    asyncRepeat((iterationDone) => {
        runOperation(parameters, iterationDone)
    }, parameters.amount, done);
}

function getParameters(jsonData) {
    const imageName = jsonData.image_name;
    const appName = jsonData.app_name;
    const servicePort = jsonData.service_port;
    const containerNetwork = appName.substring(0, 15);
    const proxyContainerName = jsonData.proxy_container_name;
    const serverName = jsonData.server_name;
    const amount = jsonData.amount || 1;
    const operation = jsonData.operation || "add";
    const internal = jsonData.internal || false;
    const memory = jsonData.memory || "100m";
    const cpu = jsonData.cpu || ".1";

    return {
        imageName,
        appName,
        servicePort,
        containerNetwork,
        proxyContainerName,
        serverName,
        operation,
        internal,
        amount,
        memory,
        cpu
    };
}

function asyncRepeat(operation, iterationAmount, done, actualIteration = 0) {
    operation(() => {
        const iteration = actualIteration + 1;
        if (iteration < iterationAmount) {
            asyncRepeat(operation, iterationAmount, done, iteration)
        } else {
            done();
        }
    });
}

function runOperation(parameters, done) {
    const operation = parameters.operation;
    const internal = parameters.internal;

    if (operation == "delete")
        return killInstance(parameters, done);

    if (operation == "replace")
        return replaceInstance(parameters, done);

    addInstance(parameters, () => done());
}

function killInstance(parameters, done) {
    const jsonArguments = {
        appName: parameters.appName,
        proxyContainerName: parameters.proxyContainerName,
        serverName: parameters.serverName
    };
    console.log("Kill arguments:", jsonArguments);

    runCommand("/usr/local/sbin/adlamin --action=kill --data='" + JSON.stringify(jsonArguments) + "'", () => done());
}

function addInstance(parameters, done) {
    if (parameters.internal) {
        return internalDeploy(parameters, () => done());
    }

    const jsonArguments = {
        imageName: parameters.imageName,
        servicePort: parameters.servicePort,
        appName: parameters.appName,
        containerNetwork: parameters.containerNetwork,
        proxyContainerName: parameters.proxyContainerName,
        serverName: parameters.serverName,
        memory: parameters.memory,
        cpu: parameters.cpu
    };
    console.log("Deploy arguments:", jsonArguments);

    runCommand("/usr/local/sbin/adlamin --action=deploy --data='" + JSON.stringify(jsonArguments) + "'", () => done());
}

function internalDeploy(parameters, done) {
    const jsonArguments = {
        imageName: parameters.imageName,
        servicePort: parameters.servicePort,
        appName: parameters.appName,
        containerNetwork: parameters.containerNetwork,
        internal: true,
        memory: parameters.memory,
        cpu: parameters.cpu
    };
    console.log("Internal deploy arguments:", jsonArguments);

    runCommand("/usr/local/sbin/adlamin --action=deploy --data='" + JSON.stringify(jsonArguments) + "'", () => done());
}


function replaceInstance(parameters, done) {
    addInstance(parameters, () => {
        killInstance(parameters, done);
    });
}

module.exports = deploy;