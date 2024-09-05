#!/bin/bash

# Update from OpenPanel 0.2.7 to 0.2.8

# new version
NEW_PANEL_VERSION="0.2.8"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

# Directories
OPENADMIN_DIR="/usr/local/admin/"
OPENCLI_DIR="/usr/local/admin/scripts/"
OPENPANEL_LOG_DIR="/var/log/openpanel/"
SERVICES_DIR="/etc/systemd/system/"
TEMP_DIR="/tmp/"

OPENPANEL_DIR="/usr/local/panel/"
CURRENT_PANEL_VERSION=$(< ${OPENPANEL_DIR}/version)


LOG_FILE="${OPENPANEL_LOG_DIR}admin/notifications.log"
DEBUG_MODE=0


# block updates for older versions!
required_version="0.2.1"

if [[ "$CURRENT_PANEL_VERSION" < "$required_version" ]]; then
    # Version is less than 0.2.1, no update will be performed
    echo ""
    echo "NO UPDATES FOR VERSIONS =< 0.1.9 - PLEASE REINSTALL OPENPANEL"
    echo "Annoucement: https://community.openpanel.com/d/65-important-update-openpanel-version-021-announcement"
    echo ""
    exit 0
else
    # Version is 0.2.1 or newer
    echo "Starting update.."
fi




# Check if the --debug flag is provided
for arg in "$@"
do
    if [ "$arg" == "--debug" ]; then
        DEBUG_MODE=1
        break
    fi
done






# HELPERS


# Display error and exit
radovan() {
    echo -e "${RED}Error: $2${RESET}" >&2
    exit $1
}


# Progress bar script
PROGRESS_BAR_URL="https://raw.githubusercontent.com/pollev/bash_progress_bar/master/progress_bar.sh"
PROGRESS_BAR_FILE="progress_bar.sh"
wget "$PROGRESS_BAR_URL" -O "$PROGRESS_BAR_FILE" > /dev/null 2>&1

if [ ! -f "$PROGRESS_BAR_FILE" ]; then
    echo "Failed to download progress_bar.sh"
    exit 1
fi

# Source the progress bar script
source "$PROGRESS_BAR_FILE"

# Dsiplay progress bar
FUNCTIONS=(

    #notify user we started
    print_header

    # added mariadb images in 027
    update_docker_images

    # update docker openpanel iamge
    download_new_panel

    # update admin from github
    download_new_admin

    # for 028 dns only
    setup_watcher

    # update opencli
    opencli_update

    # ping us
    verify_license
    
    # openpanel/openpanel should be downloaded now!
    docker_compose_up_with_newer_images

    # if user created a post-update script, run it now
    run_custom_postupdate_script

    # yay! we made it
    celebrate

    # show to user what was done and how to restore previous version if needed!
    post_install_message

    # must be at the end, otherwise breaks install process from gui
    restart_admin_panel_if_needed

)

TOTAL_STEPS=${#FUNCTIONS[@]}
CURRENT_STEP=0

update_progress() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    PERCENTAGE=$(($CURRENT_STEP * 100 / $TOTAL_STEPS))
    draw_progress_bar $PERCENTAGE
}

main() {
    # Make sure that the progress bar is cleaned up when user presses ctrl+c
    enable_trapping
    
    # Create progress bar
    setup_scroll_area
    for func in "${FUNCTIONS[@]}"
    do
        # Execute each function
        $func
        update_progress
    done
    destroy_scroll_area
}



# print fullwidth line
print_space_and_line() {
    printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
}



# END helper functions





# added in 0.2.8 for reloading bind9 zones fom withon certbot container - needed for dns validation and wildcard ssl
setup_watcher() {
    cp -fr /usr/local/admin/service/watcher.service ${SERVICES_DIR}watcher.service  > /dev/null 2>&1
    systemctl daemon-reload
    chmod +x /usr/local/admin/service/watcher.sh
    service watcher start
    systemctl enable watcher
}



restart_admin_panel_if_needed() {
    service admin restart
}

    

# START MAIN FUNCTIONS



# Function to write notification to log file
write_notification() {
  local title="$1"
  local message="$2"
  local current_message="$(date '+%Y-%m-%d %H:%M:%S') UNREAD $title MESSAGE: $message"

  echo "$current_message" >> "$LOG_FILE"
}



# logo
print_header() {
    printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
    echo -e "   ____                         _____                      _  "
    echo -e "  / __ \                       |  __ \                    | | "
    echo -e " | |  | | _ __    ___  _ __    | |__) | __ _  _ __    ___ | | "
    echo -e " | |  | || '_ \  / _ \| '_ \   |  ___/ / _\" || '_ \ / _  \| | "
    echo -e " | |__| || |_) ||  __/| | | |  | |    | (_| || | | ||  __/| | "
    echo -e "  \____/ | .__/  \___||_| |_|  |_|     \__,_||_| |_| \___||_| "
    echo -e "         | |                                                  "
    echo -e "         |_|                                                  "

    printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

    echo -e "Starting update to OpenPanel version $NEW_PANEL_VERSION"
    echo -e ""
    echo -e "Changelog: https://openpanel.com/docs/changelog/$NEW_PANEL_VERSION"        
    printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
    echo -e ""
}


update_docker_images() {
    #opencli docker-update_images
    #bash /usr/local/admin/scripts/docker/update_images
    echo "Downloading latest Nginx and Apache images from https://hub.docker.com/u/openpanel"
    echo ""

    PANEL_CONFIG_FILE="/etc/openpanel/openpanel/conf/openpanel.config"
    key_value=$(grep "^key=" $PANEL_CONFIG_FILE | cut -d'=' -f2-)
    
    # install new images
    if [ -n "$key_value" ]; then
  	    # 4 images
  	    nohup sh -c "echo openpanel/nginx:latest openpanel/apache:latest openpanel/nginx-mariadb:latest openpanel/apache-mariadb:latest | xargs -P4 -n1 docker pull" </dev/null >nohup.out 2>nohup.err &
    else
  	    # 2 images
  	    nohup sh -c "echo openpanel/nginx:latest openpanel/apache:latest | xargs -P4 -n1 docker pull" </dev/null >nohup.out 2>nohup.err &
    fi
   
}


opencli_update(){
    echo "Updating OpenCLI commands from https://storage.googleapis.com/openpanel/${NEW_PANEL_VERSION}/get.openpanel.co/downloads/${NEW_PANEL_VERSION}/opencli/opencli-main.tar.gz"
    echo ""
    mkdir -p ${TEMP_DIR}opencli
    wget -O ${TEMP_DIR}opencli.tar.gz "https://storage.googleapis.com/openpanel/${NEW_PANEL_VERSION}/get.openpanel.co/downloads/${NEW_PANEL_VERSION}/opencli/opencli-main.tar.gz"
    cd ${TEMP_DIR} && tar -xzf opencli.tar.gz -C ${TEMP_DIR}opencli
    rm -rf /usr/local/admin/scripts/
    
    cp -r ${TEMP_DIR}opencli/ /usr/local/admin/scripts/
    rm ${TEMP_DIR}opencli.tar.gz 
    rm -rf ${TEMP_DIR}opencli

    cp /usr/local/admin/scripts/opencli /usr/local/bin/opencli
    chmod +x /usr/local/bin/opencli
    chmod +x -R /usr/local/admin/scripts/
    opencli commands
    echo "# opencli aliases
    ALIASES_FILE=\"/usr/local/admin/scripts/aliases.txt\"
    generate_autocomplete() {
        awk '{print \$NF}' \"\$ALIASES_FILE\"
    }
    complete -W \"\$(generate_autocomplete)\" opencli" >> ~/.bashrc
    
    source ~/.bashrc
}



run_custom_postupdate_script() {

    echo "Checking if post-update script is provided.."
    echo ""
    # Check if the file /root/openpanel_run_after_update exists
    if [ -f "/root/openpanel_run_after_update" ]; then
        echo " "
        echo "Running post update script: '/root/openpanel_run_after_update'"
        echo "https://dev.openpanel.com/customize.html#After-update"
        bash /root/openpanel_run_after_update

    fi
}


download_new_admin() {

    mkdir -p $OPENADMIN_DIR
    echo "Updating OpenAdmin from https://github.com/stefanpejcic/openadmin"
    echo ""
    cd $OPENADMIN_DIR
    #stash is used for demo
    git stash
    git pull
    git stash pop

    # need for csf
    chmod +x ${OPENADMIN_DIR}modules/security/csf.pl
    
    cd $OPENADMIN_DIR
    pip3 install --force-reinstall zope.event || pip3 install --force-reinstall zope.event --break-system-packages

    mv /etc/openpanel/openadmin/config/terms /etc/openpanel/openadmin/config/terms_accepted_on_update

}



download_new_panel() {

    mkdir -p $OPENPANEL_DIR
    echo "Downloading latest OpenPanel image from https://hub.docker.com/r/openpanel/openpanel"
    echo ""
    docker pull openpanel/openpanel
}


docker_compose_up_with_newer_images(){

  echo "Restarting OpenPanel docker container.."
  echo ""
  docker stop openpanel &&  docker rm openpanel
  echo ""
  cd /root  
  docker compose up -d --no-deps --build openpanel

  #cp version file
  mkdir -p /usr/local/panel/  > /dev/null 2>&1
  docker cp openpanel:/usr/local/panel/version /usr/local/panel/version
}



verify_license() {
    # Get server ipv4
    current_ip=$(curl -s --max-time 10 https://ip.openpanel.co || wget -qO- --timeout=10 https://ip.openpanel.co)
    echo "Checking OpenPanel license for IP address: $current_ip" 
    echo ""
    server_hostname=$(hostname)
    license_data='{"hostname": "'"$server_hostname"'", "public_ip": "'"$current_ip"'"}'
    response=$(curl -s --max-time 10 -X POST -H "Content-Type: application/json" -d "$license_data" https://api.openpanel.co/license-check)
    #echo "Response: $response"
}




celebrate() {

    print_space_and_line

    echo ""
    echo -e "${GREEN}OpenPanel successfully updated to ${NEW_PANEL_VERSION}.${RESET}"
    echo ""

    # remove the unread notification that there is new update
    sed -i 's/UNREAD New OpenPanel update is available/READ New OpenPanel update is available/' $LOG_FILE

    # add notification that update was successful
    write_notification "OpenPanel successfully updated!" "OpenPanel successfully updated from $CURRENT_PANEL_VERSION to $NEW_PANEL_VERSION"
}



post_install_message() {

    print_space_and_line

    # Instructions for seeking help
    echo -e "\nIf you experience any problems or need further assistance, please do not hesitate to reach out on our community forums or join our Discord server for 
support:"
    echo ""
    echo "👉 Forums: https://community.openpanel.com/"
    echo ""
    echo "👉 Discord: https://discord.openpanel.com/"
    echo ""
    echo "Our community and support team are ready to help you!"
}



# main execution of the script
main