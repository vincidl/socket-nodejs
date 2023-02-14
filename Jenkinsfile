def ENVIRONNMENT
def aws_account
def registry
def service_version
def service_name

pipeline {
    agent any

    options { buildDiscarder(logRotator(numToKeepStr: '5')) }

    environment {

      // AWS
      aws_region = 'eu-west-1'

      // CICD
      sonarqube_scanner = tool('sonarqube_scanner')
    }

    stages {
        stage('Provision') {
            steps {
              cleanWs()
              checkout scm
              script {
                 switch(env.BRANCH_NAME) {
                   case "develop":
                     ENVIRONNMENT = "dev"
                     aws_account = "435323481591"
                   ; break
                   case ~/release.*/:
                     ENVIRONNMENT = "qa"
                     aws_account = "287486719145"
                   ; break
                   case "master":
                     ENVIRONNMENT = "prod"
                     aws_account = "381154905324"
                   ; break
                 }
                 def packageJSON = readJSON file: 'package.json'
                 service_name = packageJSON['name']
                 service_version = "${packageJSON['version']}-${BUILD_NUMBER}"
    	          registry = "${aws_account}.dkr.ecr.eu-west-1.amazonaws.com/${service_name}"
    	          echo "ENVIRONNMENT: ${ENVIRONNMENT} - REGISTRY: ${registry} - VERSION: ${service_name} ${service_version}"
              }
    	     }
       }


      stage('Lint') {
           steps {
               script {
                   sh '''
                     docker run --rm -i hadolint/hadolint < Dockerfile > hadolint-report.txt
                   '''
               }
           }
       }
        stage('Building image') {
            when { expression { return ENVIRONNMENT != null } }
            steps {
                script {
                    sh """
                      echo """ + github_package + """ | docker login ghcr.io -u lorevangu --password-stdin
                      docker build -t $registry:$service_version . 
                      docker tag $registry:$service_version $registry:latest
                      echo $registry:latest $WORKSPACE/Dockerfile > anchore_images
                      cat anchore_images
                    """
                }
            }
        }

       stage('Deploy infrastructure') {
           when { expression { ENVIRONNMENT != null }}
           steps {
               withAWS(role:'CICD-Deployment-Role', roleAccount: aws_account, duration: 3600, roleSessionName: 'devDeploy') {
                   cfnUpdate(
                     stack:"${service_name}-infrastructure-${ENVIRONNMENT}", file:'./aws/infrastructure.yaml',
    	              paramsFile:"./config/params_${ENVIRONNMENT}.yaml",
    	              params:['UpdateParameter': "${service_version}"],
    	              roleArn: 'arn:aws:iam::'+aws_account+':role/CICD-Cloudformation-Role', timeoutInMinutes:60, onFailure:'ROLLBACK'
    	            )
    	        }
           }
       }

       stage('Push image') {
           when { expression { ENVIRONNMENT != null }}
           steps {
               withAWS(role:'CICD-Deployment-Role', roleAccount:aws_account, duration: 3600, roleSessionName: 'devDeploy') {
                   script {
                       sh """
                         rm ~/.docker/config.json || true
                         aws ecr get-login-password --region """+aws_region+""" | docker login --username AWS --password-stdin """+registry+"""
                         docker push $registry:$service_version
                         docker push $registry:latest
                       """
                   }
               }
           }
       }

       stage('Deploy image') {
           when { expression { ENVIRONNMENT != null }}
           environment {
                 OIDC_CLIENT_SECRET=credentials('OIDC_CLIENT_SECRET')
           }
           steps {
               withAWS(role:'CICD-Deployment-Role', roleAccount: aws_account, duration: 3600, roleSessionName: 'devDeploy') {
                 cfnDelete(stack:"${service_name}-deployment-${ENVIRONNMENT}", roleArn: 'arn:aws:iam::'+aws_account+':role/CICD-Cloudformation-Role')
                 cfnUpdate(
                   stack:"${service_name}-deployment-${ENVIRONNMENT}", file:'./aws/deployment.yaml',
    	             paramsFile:"./config/params_${ENVIRONNMENT}.yaml",
    	             params:['UpdateParameter': "${service_version}"],
                   roleArn: 'arn:aws:iam::'+aws_account+':role/CICD-Cloudformation-Role', timeoutInMinutes:15, onFailure:'ROLLBACK'
                 )
               }
           }
       }

       stage ('Code Analysis') {
           agent {
             docker {
               image 'docker.io/sonarsource/sonar-scanner-cli:4.5'
               args '''
                     --volume /usr/lib/jvm/jre/lib/security/cacerts:/opt/java/openjdk/lib/security/cacerts:rw \
                     --volume ${WORKSPACE}:/usr/src:rw
                   '''
               reuseNode true
             }
           }
           steps {
             withSonarQubeEnv('Sonarqube') {
                 sh '''
                   sonar-scanner
                 '''
             }
           }
       }
    /*
       stage("Quality Gate") {
           steps {
               sleep 10
               timeout(time: 1, unit: 'MINUTES') {
                   waitForQualityGate abortPipeline: true
               }
           }
       }
    */

    	 stage('Anchore scan') {
           when { expression { ENVIRONNMENT != null }}
           steps {
             script {
               sh """
                 securityaccountid=\$(aws ssm get-parameters --region """+aws_region+""" --name '/org/member/security/baseline/account_id'  --query 'Parameters[0].Value' --output text)
                 aws s3 cp s3://anchore-enterprise-policy-\$securityaccountid-"""+aws_region+"""/policy_bundle.json .
                 curl -s https://ci-tools.anchore.io/inline_scan-v0.7.0 | bash -s -- -r -t 3600 """+registry+""":"""+service_version+""" -b policy_bundle.json
               """
             }
           }
       }
    }
    post {
        always {
          script {
            currentBuild.displayName = service_version
          }
                  archiveArtifacts artifacts: 'hadolint-report.txt', followSymlinks: false, allowEmptyArchive: true
                  archiveArtifacts artifacts: 'secret-trufflehog-report.txt', followSymlinks: false, allowEmptyArchive: true
                  archiveArtifacts artifacts: 'anchore-reports/', followSymlinks: false, allowEmptyArchive: true
            script {
              if (ENVIRONNMENT != null) {
                sh """
                  docker rmi $registry:$service_version
                  docker rmi $registry:latest
                  docker images
                """
              }
            }
        }
    }
}
