// =============================================================
// AWB DEVSECOPS PIPELINE
//
// STACK SUR VM DESKTOP (172.16.39.131) :
//   - awb-backend-1   (awb-backend)              -> A REDEPLOYER
//   - awb-frontend-1  (awb-frontend)             -> A REDEPLOYER
//   - postgres_db     (postgres:16-alpine)       -> SCAN ONLY, JAMAIS TOUCHER
//   - keycloak        (quay.io/keycloak/keycloak)-> SCAN ONLY, JAMAIS TOUCHER
//   - node-exporter   (prom/node-exporter)       -> JAMAIS TOUCHER
// =============================================================

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
        choice(name: 'TARGET_ENV', choices: ['dev', 'staging', 'prod'],
               description: 'Environnement cible (dev = auto-approve)')
        booleanParam(name: 'SKIP_DEPLOY', defaultValue: false,
                     description: 'Sauter le deploiement (build + scan uniquement)')
        booleanParam(name: 'FORCE_BUILD', defaultValue: false,
                     description: 'Forcer le build meme si security FAIL')
    }

    environment {
        VENV          = "/opt/ai-security/venv"
        APP_PIPELINE  = "/opt/ai-security/app-pipeline"
        REPORTS_DIR   = "/opt/ai-security/app-pipeline/reports"

        BUILD_TAG      = "${BUILD_NUMBER}"
        DOCKERHUB_USER = "abduuu0"
        BACKEND_IMAGE  = "abduuu0/awb-backend"
        FRONTEND_IMAGE = "abduuu0/awb-frontend"

        // Images tierces a SCANNER mais JAMAIS a redeployer
        POSTGRES_IMAGE = "postgres:16-alpine"
        KEYCLOAK_IMAGE = "quay.io/keycloak/keycloak:latest"

        // SEULS services que le pipeline est autorise a toucher
        APP_SERVICES = "backend frontend"

        // Containers PROTEGES : verifies AVANT et APRES deploy
        PROTECTED_CONTAINERS = "postgres_db keycloak node-exporter"

        SONAR_HOST_URL = "http://localhost:9000"
        DTRACK_URL     = "http://localhost:8081"

        // Seuil applique UNIQUEMENT aux images backend/frontend
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
                    echo " AWB DEVSECOPS PIPELINE - Build ${BUILD_NUMBER}"
                    echo " App services (rolling) : ${APP_SERVICES}"
                    echo " Containers proteges    : ${PROTECTED_CONTAINERS}"
                    echo " Trivy scan             : backend, frontend, ${POSTGRES_IMAGE}, ${KEYCLOAK_IMAGE}"
                    echo " Trivy gate (app only)  : ${TRIVY_CRITICAL_THRESHOLD} CRITICAL max"
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
                                    gitleaks detect --source . \
                                        --report-path ${REPORTS_DIR}/gitleaks/report.json \
                                        --report-format json --no-banner --exit-code 0
                                    LEAKS=$(${VENV}/bin/python -c "
import json
try:
    with open('${REPORTS_DIR}/gitleaks/report.json') as f: d = json.load(f)
    print(len(d) if isinstance(d, list) else 0)
except Exception: print(0)
")
                                    echo "[Gitleaks] ${LEAKS} secret(s)"
                                    if [ "${LEAKS}" -gt 0 ] && [ "${DP_FORCE_BUILD}" != "true" ]; then exit 1; fi
                                '''
                            }
                        }
                        stage('[SECURITY] SonarQube SAST') {
                            steps {
                                withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                                    sh '''
                                        set +e
                                        docker run --rm --network host \
                                            -v "${WORKSPACE}:/usr/src" \
                                            -e SONAR_HOST_URL=${SONAR_HOST_URL} \
                                            -e SONAR_TOKEN=${SONAR_TOKEN} \
                                            sonarsource/sonar-scanner-cli \
                                            -Dsonar.projectKey=awb-app \
                                            -Dsonar.qualitygate.wait=false \
                                            > ${REPORTS_DIR}/sonarqube/scan.log 2>&1
                                        SONAR_RC=$?
                                        tail -20 ${REPORTS_DIR}/sonarqube/scan.log
                                        if [ "${SONAR_RC}" -ne 0 ] && [ "${DP_FORCE_BUILD}" != "true" ]; then exit 1; fi
                                    '''
                                }
                            }
                        }
                        stage('[SECURITY] SCA — CycloneDX + DTrack') {
                            steps {
                                withCredentials([string(credentialsId: 'dtrack-api-key', variable: 'DTRACK_API_KEY')]) {
                                    sh '''
                                        set +e
                                        if [ -f backend/requirements.txt ]; then
                                            cd backend
                                            ${VENV}/bin/cyclonedx-py requirements requirements.txt \
                                                -o ${REPORTS_DIR}/sca/backend-sbom.json --output-format JSON || true
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
                                    if [ -f frontend/package.json ]; then
                                        cd frontend
                                        npm run typecheck 2>&1 | tee ${REPORTS_DIR}/quality/frontend-typecheck.log || true
                                        cd ..
                                    fi
                                '''
                            }
                        }
                        stage('[QUALITY] Backend Tests') {
                            steps {
                                sh '''
                                    set +e
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
                    echo " SECURITY=${securityStatus}  QUALITY=${qualityStatus}"
                    if (securityStatus == "FAIL" && params.FORCE_BUILD == false) {
                        error("Security FAILED — utilisez FORCE_BUILD=true pour outrepasser")
                    }
                    if (params.TARGET_ENV != 'dev') {
                        timeout(time: 30, unit: 'MINUTES') {
                            input(message: "Approuver le deploy ${params.TARGET_ENV} ?", ok: 'Approve')
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
                        echo "[*] === Build images applicatives uniquement ==="
                        docker build -t ${BACKEND_IMAGE}:${BUILD_TAG} ./backend
                        docker tag ${BACKEND_IMAGE}:${BUILD_TAG} ${BACKEND_IMAGE}:latest

                        docker build \
                            --build-arg VITE_API_BASE_URL=http://${VM_IP}:8000 \
                            --build-arg VITE_KEYCLOAK_URL=http://${VM_IP}:8080 \
                            --build-arg VITE_KEYCLOAK_REALM=myrealm \
                            --build-arg VITE_KEYCLOAK_CLIENT_ID=frontend-app \
                            -t ${FRONTEND_IMAGE}:${BUILD_TAG} ./frontend
                        docker tag ${FRONTEND_IMAGE}:${BUILD_TAG} ${FRONTEND_IMAGE}:latest
                    '''
                }
            }
            post {
                success { script { buildStatus = "PASS" } }
                failure { script { buildStatus = "FAIL" } }
            }
        }

        stage('Trivy Scan (4 images)') {
            steps {
                sh '''
                    set +e
                    echo "[*] === Trivy scan 4 images ==="
                    echo "    APP   (gate ON)  : backend + frontend"
                    echo "    THIRD (info only): postgres:16-alpine + keycloak:latest"

                    # Pull des images tierces sur le serveur Jenkins UNIQUEMENT
                    # (la VM Desktop n est PAS touchee)
                    docker pull ${POSTGRES_IMAGE} || echo "  WARN pull postgres"
                    docker pull ${KEYCLOAK_IMAGE} || echo "  WARN pull keycloak"

                    # ---- APP images : gate ACTIVE ----
                    for img in ${BACKEND_IMAGE}:${BUILD_TAG} ${FRONTEND_IMAGE}:${BUILD_TAG}; do
                        IMG_NAME=$(echo $img | sed "s|/|_|g; s|:|_|g")
                        echo "[Trivy APP] $img"
                        trivy image --severity HIGH,CRITICAL --format json \
                            --output ${REPORTS_DIR}/trivy/app_${IMG_NAME}.json ${img}
                        trivy image --severity HIGH,CRITICAL --format table ${img} \
                            | tee ${REPORTS_DIR}/trivy/app_${IMG_NAME}.txt
                    done

                    # ---- THIRD-PARTY : visibilite uniquement ----
                    for img in ${POSTGRES_IMAGE} ${KEYCLOAK_IMAGE}; do
                        IMG_NAME=$(echo $img | sed "s|/|_|g; s|:|_|g")
                        echo "[Trivy 3rd] $img"
                        trivy image --severity HIGH,CRITICAL --format json \
                            --output ${REPORTS_DIR}/trivy/thirdparty_${IMG_NAME}.json ${img} || true
                        trivy image --severity HIGH,CRITICAL --format table ${img} \
                            | tee ${REPORTS_DIR}/trivy/thirdparty_${IMG_NAME}.txt || true
                    done

                    # Comptage CRITICAL : SEULEMENT app_*.json
                    CRITICAL=$(${VENV}/bin/python -c "
import json, glob
total = 0
for f in glob.glob('${REPORTS_DIR}/trivy/app_*.json'):
    with open(f) as fp: d = json.load(fp)
    for r in d.get('Results', []):
        for v in r.get('Vulnerabilities') or []:
            if v.get('Severity') == 'CRITICAL': total += 1
print(total)
")
                    THIRD=$(${VENV}/bin/python -c "
import json, glob
total = 0
for f in glob.glob('${REPORTS_DIR}/trivy/thirdparty_*.json'):
    try:
        with open(f) as fp: d = json.load(fp)
        for r in d.get('Results', []):
            for v in r.get('Vulnerabilities') or []:
                if v.get('Severity') == 'CRITICAL': total += 1
    except Exception: pass
print(total)
")
                    echo "============================================================"
                    echo " APP   (backend+frontend)  : ${CRITICAL} CRITICAL [seuil ${TRIVY_CRITICAL_THRESHOLD}]"
                    echo " THIRD (postgres+keycloak): ${THIRD} CRITICAL [info]"
                    echo "============================================================"
                    if [ "${CRITICAL}" -gt "${TRIVY_CRITICAL_THRESHOLD}" ] && [ "${DP_FORCE_BUILD}" != "true" ]; then
                        exit 1
                    fi
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
                        docker logout || true
                        echo "${DH_PASS}" | docker login -u "${DH_USER}" --password-stdin
                        push_with_retry () {
                            for i in 1 2 3 4 5; do
                                docker push $1 && return 0
                                sleep 20
                            done
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

        stage('Deploy → VM Desktop (PARTIEL: backend+frontend uniquement)') {
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

                        # ============================================================
                        # GARDE-FOU 1 : APP_SERVICES n est pas un nom protege
                        # ============================================================
                        echo "[*] [G1] APP_SERVICES vs PROTECTED_CONTAINERS..."
                        for svc in ${APP_SERVICES}; do
                            for p in ${PROTECTED_CONTAINERS}; do
                                if [ "$svc" = "$p" ]; then
                                    echo "FATAL: APP_SERVICES contient nom protege '$svc'"
                                    exit 1
                                fi
                            done
                        done
                        echo "    OK"

                        # SSH
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            -o ConnectTimeout=10 \
                            ${SSH_USER}@${VM_IP} "echo SSH OK && hostname"

                        # ============================================================
                        # GARDE-FOU 2 : Snapshot IDs containers proteges AVANT
                        # ============================================================
                        echo "[*] [G2] Snapshot AVANT..."
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "for c in ${PROTECTED_CONTAINERS}; do \
                                docker ps --filter name=^\\\${c}\\$ --format '{{.Names}}|{{.ID}}' || true; \
                             done" > ${REPORTS_DIR}/deploy/protected_before.txt
                        cat ${REPORTS_DIR}/deploy/protected_before.txt

                        # ============================================================
                        # GARDE-FOU 3 : compose local ne declare pas de service interdit
                        # ============================================================
                        echo "[*] [G3] Verification docker-compose.prod.yml local..."
                        for risky in postgres postgresql postgres_db db database keycloak auth identity node-exporter exporter prometheus; do
                            if grep -qE "^[[:space:]]+${risky}[[:space:]]*:" docker-compose.prod.yml 2>/dev/null; then
                                MATCH=0
                                for app in ${APP_SERVICES}; do
                                    [ "$app" = "$risky" ] && MATCH=1
                                done
                                if [ "$MATCH" -eq 0 ]; then
                                    echo "FATAL: compose declare service interdit '${risky}'"
                                    exit 1
                                fi
                            fi
                        done
                        echo "    OK"

                        # Prepare directory
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "mkdir -p ~/awb-deploy && \
                             chmod -R u+w ~/awb-deploy/ 2>/dev/null || true && \
                             rm -f ~/awb-deploy/backend.env ~/awb-deploy/.env ~/awb-deploy/docker-compose.yml || true"

                        # Copy files
                        scp -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            docker-compose.prod.yml \
                            ${SSH_USER}@${VM_IP}:~/awb-deploy/docker-compose.yml
                        scp -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${BACKEND_ENV_FILE} \
                            ${SSH_USER}@${VM_IP}:~/awb-deploy/backend.env
                        scp -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${ROOT_ENV_FILE} \
                            ${SSH_USER}@${VM_IP}:~/awb-deploy/.env
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "chmod 600 ~/awb-deploy/backend.env ~/awb-deploy/.env"

                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "cd ~/awb-deploy && \
                             sed -i 's|^BUILD_TAG=.*|BUILD_TAG=${BUILD_TAG}|' .env && \
                             sed -i 's|^DOCKERHUB_USER=.*|DOCKERHUB_USER=${DOCKERHUB_USER}|' .env && \
                             grep -E '^(BUILD_TAG|DOCKERHUB_USER)=' .env"

                        # ============================================================
                        # GARDE-FOU 4 : compose distant ne declare QUE APP_SERVICES
                        # ============================================================
                        echo "[*] [G4] Verification compose distant..."
                        DECLARED=$(ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "cd ~/awb-deploy && docker compose config --services 2>/dev/null | sort | tr '\\n' ' '")
                        echo "    Services compose distant: '${DECLARED}'"
                        for svc in ${APP_SERVICES}; do
                            if ! echo "${DECLARED}" | grep -qw "${svc}"; then
                                echo "FATAL: service '${svc}' absent du compose distant"
                                exit 1
                            fi
                        done
                        for p in ${PROTECTED_CONTAINERS}; do
                            if echo "${DECLARED}" | grep -qw "${p}"; then
                                echo "FATAL: compose distant declare '${p}' (PROTEGE)"
                                exit 1
                            fi
                        done
                        echo "    OK"

                        # ============================================================
                        # ROLLING UPDATE PARTIEL :
                        #   --no-deps         : ignore dependances
                        #   services nommes   : compose ne touche QUE backend frontend
                        # ============================================================
                        echo "[*] Pull images..."
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "cd ~/awb-deploy && docker compose pull ${APP_SERVICES}"

                        echo "[*] Recreate ${APP_SERVICES}..."
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "cd ~/awb-deploy && docker compose up -d --no-deps --force-recreate ${APP_SERVICES}" \
                             | tee ${REPORTS_DIR}/deploy/deploy.log

                        # ============================================================
                        # GARDE-FOU 5 : Snapshot APRES = AVANT pour containers proteges
                        # ============================================================
                        echo "[*] [G5] Verification post-deploy..."
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "for c in ${PROTECTED_CONTAINERS}; do \
                                docker ps --filter name=^\\\${c}\\$ --format '{{.Names}}|{{.ID}}' || true; \
                             done" > ${REPORTS_DIR}/deploy/protected_after.txt
                        cat ${REPORTS_DIR}/deploy/protected_after.txt

                        if diff -q ${REPORTS_DIR}/deploy/protected_before.txt \
                                   ${REPORTS_DIR}/deploy/protected_after.txt > /dev/null; then
                            echo "    OK : containers proteges INTACTS"
                        else
                            echo "ALERTE : un container protege a bouge !"
                            diff ${REPORTS_DIR}/deploy/protected_before.txt \
                                 ${REPORTS_DIR}/deploy/protected_after.txt || true
                            exit 1
                        fi

                        # Etat final
                        echo "[*] Etat final :"
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@${VM_IP} \
                            "docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}'"
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
                        echo "[*] Wait 15s..."
                        sleep 15
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
            sh '''
                mkdir -p ${WORKSPACE}/reports
                cp -r ${REPORTS_DIR}/* ${WORKSPACE}/reports/ 2>/dev/null || true
            '''
            script {
                if (buildStatus == "PENDING")    { buildStatus    = "NOT_REACHED" }
                if (deployStatus == "PENDING")   { deployStatus   = (params.SKIP_DEPLOY == true) ? "SKIPPED" : "NOT_REACHED" }
                if (securityStatus == "PENDING") { securityStatus = "NOT_REACHED" }
                if (qualityStatus == "PENDING")  { qualityStatus  = "NOT_REACHED" }

                echo "============================================================"
                echo " Build ${env.BUILD_NUMBER}: SEC=${securityStatus} QA=${qualityStatus} BUILD=${buildStatus} DEPLOY=${deployStatus}"
                echo "============================================================"

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
            archiveArtifacts artifacts: 'consolidated_report.json', allowEmptyArchive: true
            archiveArtifacts artifacts: 'reports/**/*', allowEmptyArchive: true, fingerprint: true
            junit allowEmptyResults: true, testResults: 'reports/quality/backend-tests.xml'
        }
        success { echo "AWB DEVSECOPS : SUCCESS — Build ${env.BUILD_NUMBER}" }
        failure { echo "AWB DEVSECOPS : FAILED — Build ${env.BUILD_NUMBER}" }
    }
}
