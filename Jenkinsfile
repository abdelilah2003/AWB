// =============================================================
// AWB DEVSECOPS PIPELINE — Adapte a la stack reelle
// Compatible merge futur avec AI Security pipeline
// =============================================================

// Variables globales Groovy (en dehors de environment {})
// Elles persistent de maniere fiable entre stages, contrairement a env.X
def securityStatus = "PENDING"
def qualityStatus  = "PENDING"
def buildStatus    = "PENDING"
def deployStatus   = "PENDING"

pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
    }

    parameters {
        choice(name: 'TARGET_ENV',
               choices: ['dev', 'staging', 'prod'],
               description: 'Environnement cible (dev = auto-approve)')
        booleanParam(name: 'SKIP_DEPLOY',
                     defaultValue: false,
                     description: 'Sauter le deploiement (build + scan uniquement)')
        booleanParam(name: 'FORCE_BUILD',
                     defaultValue: false,
                     description: 'Forcer le build meme si security FAIL')
    }

    environment {
        VENV          = "/opt/ai-security/venv"
        APP_PIPELINE  = "/opt/ai-security/app-pipeline"
        REPORTS_DIR   = "/opt/ai-security/app-pipeline/reports"

        BUILD_TAG     = "${BUILD_NUMBER}"
        DOCKERHUB_USER = "abduuu0"
        BACKEND_IMAGE  = "abduuu0/awb-backend"
        FRONTEND_IMAGE = "abduuu0/awb-frontend"

        SONAR_HOST_URL = "http://localhost:9000"
        DTRACK_URL     = "http://localhost:8081"

        // Seuils security
        TRIVY_CRITICAL_THRESHOLD = "30"

        DP_TARGET_ENV  = "${params.TARGET_ENV}"
        DP_SKIP_DEPLOY = "${params.SKIP_DEPLOY}"
        DP_FORCE_BUILD = "${params.FORCE_BUILD}"
    }

    stages {

        stage('Init') {
            steps {
                sh '''
                    set -e
                    mkdir -p ${REPORTS_DIR}/{gitleaks,sonarqube,sca,trivy,deploy,quality}

                    echo "============================================================"
                    echo " AWB DEVSECOPS PIPELINE"
                    echo " Build       : ${BUILD_NUMBER}"
                    echo " Env         : ${DP_TARGET_ENV}"
                    echo " Backend img : ${BACKEND_IMAGE}:${BUILD_TAG}"
                    echo " Frontend img: ${FRONTEND_IMAGE}:${BUILD_TAG}"
                    echo " Trivy gate  : ${TRIVY_CRITICAL_THRESHOLD} CRITICAL max"
                    echo "============================================================"
                '''
            }
        }

        stage('Parallel : Security + Quality') {
            parallel {

                stage('[SECURITY] Static Analysis') {
                    stages {

                        stage('[SECURITY] Gitleaks') {
                            steps {
                                sh '''
                                    set +e
                                    echo "[*] === Gitleaks ==="
                                    gitleaks detect \
                                        --source . \
                                        --report-path ${REPORTS_DIR}/gitleaks/report.json \
                                        --report-format json \
                                        --no-banner \
                                        --exit-code 0

                                    LEAKS=$(${VENV}/bin/python -c "
import json
try:
    with open('${REPORTS_DIR}/gitleaks/report.json') as f:
        d = json.load(f)
    print(len(d) if isinstance(d, list) else 0)
except Exception:
    print(0)
")
                                    echo "[Gitleaks] ${LEAKS} secret(s)"
                                    echo "${LEAKS}" > ${REPORTS_DIR}/gitleaks/count.txt

                                    if [ "${LEAKS}" -gt 0 ] && [ "${DP_FORCE_BUILD}" != "true" ]; then
                                        exit 1
                                    fi
                                '''
                            }
                        }

                        stage('[SECURITY] SonarQube SAST') {
                            steps {
                                withCredentials([string(credentialsId: 'sonarqube-token',
                                                        variable: 'SONAR_TOKEN')]) {
                                    sh '''
                                        set +e
                                        echo "[*] === SonarQube ==="
                                        docker run --rm \
                                            --network host \
                                            -v "${WORKSPACE}:/usr/src" \
                                            -e SONAR_HOST_URL=${SONAR_HOST_URL} \
                                            -e SONAR_TOKEN=${SONAR_TOKEN} \
                                            sonarsource/sonar-scanner-cli \
                                            -Dsonar.projectKey=awb-app \
                                            -Dsonar.qualitygate.wait=false \
                                            > ${REPORTS_DIR}/sonarqube/scan.log 2>&1

                                        SONAR_RC=$?
                                        echo "[SonarQube] exit ${SONAR_RC}"
                                        tail -20 ${REPORTS_DIR}/sonarqube/scan.log

                                        if [ "${SONAR_RC}" -ne 0 ] && [ "${DP_FORCE_BUILD}" != "true" ]; then
                                            exit 1
                                        fi
                                    '''
                                }
                            }
                        }

                        stage('[SECURITY] SCA — CycloneDX + DTrack') {
                            steps {
                                withCredentials([string(credentialsId: 'dtrack-api-key',
                                                        variable: 'DTRACK_API_KEY')]) {
                                    sh '''
                                        set +e
                                        echo "[*] === SCA ==="

                                        if [ -f backend/requirements.txt ]; then
                                            cd backend
                                            ${VENV}/bin/cyclonedx-py requirements requirements.txt \
                                                -o ${REPORTS_DIR}/sca/backend-sbom.json \
                                                --output-format JSON || true
                                            cd ..
                                        fi

                                        if [ -f frontend/package.json ]; then
                                            cd frontend
                                            [ ! -d node_modules ] && npm ci --silent || true
                                            npx --yes @cyclonedx/cyclonedx-npm \
                                                --output-file ${REPORTS_DIR}/sca/frontend-sbom.json \
                                                --output-format JSON || true
                                            cd ..
                                        fi

                                        for component in backend frontend; do
                                            SBOM_FILE="${REPORTS_DIR}/sca/${component}-sbom.json"
                                            if [ -f "${SBOM_FILE}" ]; then
                                                curl -s -X POST "${DTRACK_URL}/api/v1/bom" \
                                                    -H "X-Api-Key: ${DTRACK_API_KEY}" \
                                                    -F "autoCreate=true" \
                                                    -F "projectName=awb-${component}" \
                                                    -F "projectVersion=${BUILD_TAG}" \
                                                    -F "bom=@${SBOM_FILE}" \
                                                    > ${REPORTS_DIR}/sca/dtrack-upload-${component}.json
                                                echo "[DTrack] ${component} OK"
                                            fi
                                        done
                                    '''
                                }
                            }
                        }
                    }
                    post {
                        success { script { securityStatus = "PASS" } }
                        failure { script { securityStatus = "FAIL" } }
                        unstable { script { securityStatus = "UNSTABLE" } }
                    }
                }

                stage('[QUALITY] Tests & Lint') {
                    stages {

                        stage('[QUALITY] Frontend Lint') {
                            steps {
                                sh '''
                                    set +e
                                    echo "[*] === Frontend Lint ==="
                                    if [ -f frontend/package.json ]; then
                                        cd frontend
                                        [ ! -d node_modules ] && npm ci --silent
                                        npm run lint 2>&1 | tee ${REPORTS_DIR}/quality/frontend-lint.log || true
                                        cd ..
                                    fi
                                '''
                            }
                        }

                        stage('[QUALITY] Frontend TypeCheck') {
                            steps {
                                sh '''
                                    set +e
                                    echo "[*] === Frontend TypeCheck ==="
                                    if [ -f frontend/package.json ]; then
                                        cd frontend
                                        npm run typecheck 2>&1 | tee ${REPORTS_DIR}/quality/frontend-typecheck.log || true
                                        cd ..
                                    fi
                                '''
                            }
                        }

                        stage('[QUALITY] Backend Tests (tolerant)') {
                            steps {
                                sh '''
                                    set +e
                                    echo "[*] === Backend Tests ==="
                                    if [ -d backend ]; then
                                        cd backend
                                        ${VENV}/bin/pip install -q -r requirements.txt 2>&1 | tail -5 || true
                                        ${VENV}/bin/pip install -q pytest pytest-cov 2>/dev/null || true
                                        ${VENV}/bin/python -m pytest \
                                            --junitxml=${REPORTS_DIR}/quality/backend-tests.xml \
                                            2>&1 | tee ${REPORTS_DIR}/quality/backend-tests.log || true
                                        cd ..
                                    fi
                                '''
                            }
                        }
                    }
                    post {
                        success { script { qualityStatus = "PASS" } }
                        failure { script { qualityStatus = "FAIL" } }
                        unstable { script { qualityStatus = "UNSTABLE" } }
                    }
                }
            }
        }

        stage('Security Verdict') {
            steps {
                script {
                    echo "============================================================"
                    echo " SECURITY = ${securityStatus}"
                    echo " QUALITY  = ${qualityStatus}"
                    echo "============================================================"

                    if (securityStatus == "FAIL" && params.FORCE_BUILD == false) {
                        error("Security FAILED — utilisez FORCE_BUILD=true pour outrepasser")
                    }

                    if (params.TARGET_ENV != 'dev') {
                        timeout(time: 30, unit: 'MINUTES') {
                            input(message: "Approuver le deploy ${params.TARGET_ENV} ?",
                                  ok: 'Approve')
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                withCredentials([string(credentialsId: 'vm-desktop-ip', variable: 'VM_IP')]) {
                    sh '''
                        set -e
                        echo "[*] === Build images ==="

                        docker build -t ${BACKEND_IMAGE}:${BUILD_TAG} ./backend
                        docker tag ${BACKEND_IMAGE}:${BUILD_TAG} ${BACKEND_IMAGE}:latest

                        docker build \
                            --build-arg VITE_API_BASE_URL=http://${VM_IP}:8000 \
                            --build-arg VITE_KEYCLOAK_URL=http://${VM_IP}:8080 \
                            --build-arg VITE_KEYCLOAK_REALM=myrealm \
                            --build-arg VITE_KEYCLOAK_CLIENT_ID=frontend-app \
                            -t ${FRONTEND_IMAGE}:${BUILD_TAG} ./frontend
                        docker tag ${FRONTEND_IMAGE}:${BUILD_TAG} ${FRONTEND_IMAGE}:latest

                        docker images | grep -E "abduuu0/awb" | head -5
                    '''
                }
            }
            post {
                success { script { buildStatus = "PASS" } }
                failure { script { buildStatus = "FAIL" } }
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh '''
                    set +e
                    echo "[*] === Trivy ==="

                    for img in ${BACKEND_IMAGE}:${BUILD_TAG} ${FRONTEND_IMAGE}:${BUILD_TAG}; do
                        IMG_NAME=$(echo $img | sed "s|/|_|g; s|:|_|g")
                        trivy image --severity HIGH,CRITICAL --format json \
                            --output ${REPORTS_DIR}/trivy/${IMG_NAME}.json ${img}
                        trivy image --severity HIGH,CRITICAL --format table ${img} \
                            | tee ${REPORTS_DIR}/trivy/${IMG_NAME}.txt
                    done

                    CRITICAL=$(${VENV}/bin/python -c "
import json, glob
total = 0
for f in glob.glob('${REPORTS_DIR}/trivy/*.json'):
    with open(f) as fp:
        d = json.load(fp)
    for r in d.get('Results', []):
        for v in r.get('Vulnerabilities') or []:
            if v.get('Severity') == 'CRITICAL':
                total += 1
print(total)
")
                    echo "[Trivy] ${CRITICAL} CRITICAL (seuil: ${TRIVY_CRITICAL_THRESHOLD})"
                    if [ "${CRITICAL}" -gt "${TRIVY_CRITICAL_THRESHOLD}" ] && [ "${DP_FORCE_BUILD}" != "true" ]; then
                        echo "[Trivy] FAIL : ${CRITICAL} > ${TRIVY_CRITICAL_THRESHOLD}"
                        exit 1
                    fi
                    echo "[Trivy] OK : ${CRITICAL} <= ${TRIVY_CRITICAL_THRESHOLD}"
                '''
            }
        }

        stage('Push Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                )]) {
                    sh '''
                        set -e
                        echo "[*] === Push DockerHub ==="

                        docker logout || true
                        echo "${DH_PASS}" | docker login -u "${DH_USER}" --password-stdin

                        push_with_retry () {
                            IMAGE=$1
                            for i in 1 2 3 4 5; do
                                echo "Attempt $i -> $IMAGE"
                                docker push $IMAGE && return 0
                                echo "Push failed, retrying in 20s..."
                                sleep 20
                            done
                            echo "Push FAILED after retries: $IMAGE"
                            exit 1
                        }

                        push_with_retry ${BACKEND_IMAGE}:${BUILD_TAG}
                        push_with_retry ${BACKEND_IMAGE}:latest
                        push_with_retry ${FRONTEND_IMAGE}:${BUILD_TAG}
                        push_with_retry ${FRONTEND_IMAGE}:latest

                        docker logout
                    '''
                }
            }
        }

        stage('Deploy → VM Desktop') {
            when { expression { return params.SKIP_DEPLOY == false } }
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'vm-desktop-ssh',
                                      keyFileVariable: 'SSH_KEY',
                                      usernameVariable: 'SSH_USER'),
                    string(credentialsId: 'vm-desktop-ip', variable: 'VM_IP'),
                    file(credentialsId: 'app-backend-env', variable: 'BACKEND_ENV_FILE'),
                    file(credentialsId: 'app-root-env', variable: 'ROOT_ENV_FILE')
                ]) {
                    sh '''
                        set -e
                        echo "[*] === Deploy -> ${VM_IP} ==="

                        # Test connectivite SSH avant de continuer
                        echo "[*] Test SSH connection..."
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            -o ConnectTimeout=10 \
                            ${SSH_USER}@${VM_IP} "echo SSH OK && hostname && whoami"

                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} "mkdir -p ~/awb-deploy"

                        echo "[*] Copy compose file..."
                        scp -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            docker-compose.prod.yml \
                            ${SSH_USER}@${VM_IP}:~/awb-deploy/docker-compose.yml

                        echo "[*] Copy env files..."
                        scp -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${BACKEND_ENV_FILE} \
                            ${SSH_USER}@${VM_IP}:~/awb-deploy/backend.env

                        scp -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${ROOT_ENV_FILE} \
                            ${SSH_USER}@${VM_IP}:~/awb-deploy/.env

                        echo "[*] Pull & up..."
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "cd ~/awb-deploy && \
                             sed -i 's|^BUILD_TAG=.*|BUILD_TAG=${BUILD_TAG}|' .env && \
                             sed -i 's|^DOCKERHUB_USER=.*|DOCKERHUB_USER=${DOCKERHUB_USER}|' .env && \
                             docker compose pull && \
                             docker compose up -d --remove-orphans && \
                             docker ps" \
                             | tee ${REPORTS_DIR}/deploy/deploy.log
                    '''
                }
            }
            post {
                success { script { deployStatus = "PASS" } }
                failure { script { deployStatus = "FAIL" } }
            }
        }

        stage('Health Check') {
            when { expression { return params.SKIP_DEPLOY == false } }
            steps {
                withCredentials([string(credentialsId: 'vm-desktop-ip', variable: 'VM_IP')]) {
                    sh '''
                        set +e
                        sleep 20
                        for endpoint in "http://${VM_IP}:8000/docs" "http://${VM_IP}:5173" "http://${VM_IP}:8080"; do
                            CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 ${endpoint})
                            echo "  ${endpoint} -> HTTP ${CODE}"
                        done | tee ${REPORTS_DIR}/deploy/health.log
                    '''
                }
            }
        }
    }

    post {
        always {
            // Copier les rapports dans le workspace
            sh '''
                mkdir -p ${WORKSPACE}/reports
                cp -r ${REPORTS_DIR}/* ${WORKSPACE}/reports/ 2>/dev/null || true
            '''

            script {
                // Normaliser les statuts qui n'ont jamais ete mis a jour
                if (buildStatus == "PENDING") {
                    buildStatus = "NOT_REACHED"
                }
                if (deployStatus == "PENDING") {
                    deployStatus = (params.SKIP_DEPLOY == true) ? "SKIPPED" : "NOT_REACHED"
                }
                if (securityStatus == "PENDING") {
                    securityStatus = "NOT_REACHED"
                }
                if (qualityStatus == "PENDING") {
                    qualityStatus = "NOT_REACHED"
                }

                echo "============================================================"
                echo " CONSOLIDATION FINALE — Build ${env.BUILD_NUMBER}"
                echo "   SECURITY = ${securityStatus}"
                echo "   QUALITY  = ${qualityStatus}"
                echo "   BUILD    = ${buildStatus}"
                echo "   DEPLOY   = ${deployStatus}"
                echo "============================================================"

                // Generer le rapport meme si une stage precedente a fail
                // On utilise || true pour eviter que le script Python fasse fail
                // le build (verdict PARTIAL = exit 1 dans le script Python)
                sh """
                    ${env.VENV}/bin/python ${env.APP_PIPELINE}/scripts/consolidate_app_report.py \\
                        --reports-dir   "${env.REPORTS_DIR}" \\
                        --security      "${securityStatus}" \\
                        --quality       "${qualityStatus}" \\
                        --build         "${buildStatus}" \\
                        --deploy        "${deployStatus}" \\
                        --build-id      "${env.BUILD_NUMBER}" \\
                        --target-env    "${env.DP_TARGET_ENV}" \\
                        --output        "${env.WORKSPACE}/consolidated_report.json" || true
                """
            }

            archiveArtifacts artifacts: 'consolidated_report.json',
                             allowEmptyArchive: true
            archiveArtifacts artifacts: 'reports/**/*',
                             allowEmptyArchive: true,
                             fingerprint: true
            junit allowEmptyResults: true,
                  testResults: 'reports/quality/backend-tests.xml'
        }
        success {
            echo "AWB DEVSECOPS : SUCCESS — Build ${env.BUILD_NUMBER}"
        }
        failure {
            echo "AWB DEVSECOPS : FAILED — Build ${env.BUILD_NUMBER}"
        }
    }
}
