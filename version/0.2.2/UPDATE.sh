#!/bin/bash

# Update from OpenPanel 0.2.1 to 0.2.2

# new version
NEW_PANEL_VERSION="0.2.2"


# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

# Directories
OPENADMIN_DIR="/usr/local/admin/"
OPENCLI_DIR="/usr/local/admin/scripts/"
OPENPANEL_ERR_DIR="/var/log/openpanel/"
SERVICES_DIR="/etc/systemd/system/"

OPENPANEL_DIR="/usr/local/panel/"
CURRENT_PANEL_VERSION=$(< ${OPENPANEL_DIR}/version)


# block updates for older versions!
required_version="0.2.1"

if [[ "$CURRENT_PANEL_VERSION" < "$required_version" ]]; then
    # Version is less than 0.2.1, no update will be performed
    echo ""
    echo "NO UPDATES FOR VERSIONS =< 0.1.9"
    echo "Annoucement: https://community.openpanel.co/d/65-important-update-openpanel-version-021-announcement"
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

    # update images!
    update_docker_images

    # update admin from github
    download_new_admin

    # update docker openpanel iamge
    download_new_panel

    #
    verify_license

    # new crons added
    set_system_cronjob

    # openpanel/openpanel should be downloaded now!
    docker_compsoe_up_with_newer_images
    
    # delete temp files and (maybe) old panel versison
    cleanup

    # if user created a post-update script, run it now
    run_custom_postupdate_script

    # yay! we made it
    celebrate

    # show to user what was done and how to restore previous version if needed!
    post_install_message

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









# START MAIN FUNCTIONS



# Function to write notification to log file
write_notification() {
  local title="$1"
  local message="$2"
  local current_message="$(date '+%Y-%m-%d %H:%M:%S') UNREAD $title MESSAGE: $message"

  echo "$current_message" >> "$LOG_FILE"
}



cleanup(){
    echo "Cleaning up.."
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
    echo -e "Changelog: https://openpanel.co/docs/changelog/$NEW_PANEL_VERSION"        
    printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -
    echo -e ""
}


update_docker_images() {
    #opencli docker-update_images
    #bash /usr/local/admin/scripts/docker/update_images
    echo "Downloading latest Nginx and Apache images from https://hub.docker.com/u/openpanel"
    nohup sh -c "echo openpanel/nginx:latest openpanel/apache:latest | xargs -P4 -n1 docker pull" </dev/null >nohup.out 2>nohup.err &
}


run_custom_postupdate_script() {

    echo "Checking if post-update script is provided.."

    # Check if the file /root/openpanel_run_after_update exists
    if [ -f "/root/openpanel_run_after_update" ]; then
        # run the custom script
        echo " "
        echo "Running post install script: '/root/openpanel_run_after_update'"
        echo "https://dev.openpanel.co/customize.html#After-update"
        bash /root/openpanel_run_after_update

    fi
}



download_new_admin() {

    mkdir -p $OPENADMIN_DIR
    echo "Updating OpenAdmin from https://github.com/stefanpejcic/openadmin"
    cd /usr/local/admin/
    git pull

    service admin restart
}



download_new_panel() {

    mkdir -p $OPENPANEL_DIR
    echo "Downloading latest OpenPanel image from https://hub.docker.com/r/openpanel/openpanel"
    nohup sh -c "echo openpanel/openpanel:latest | xargs -P4 -n1 docker pull" </dev/null >nohup.out 2>nohup.err &
}

set_system_cronjob(){

    echo "Updating cronjobs.."
    wget -O /etc/cron.d/openpanel https://raw.githubusercontent.com/stefanpejcic/openpanel-configuration/main/cron
    chown root:root /etc/cron.d/openpanel
    chmod 0600 /etc/cron.d/openpanel
}


docker_compsoe_up_with_newer_images(){

  echo "Restarting OpenPanel docekr container.."
  docker stop openpanel &&  docker rm openpanel
  
  cd /root  
  docker compose up -d

  #cp version file
  mkdir -p /usr/local/panel/  > /dev/null 2>&1
  docker cp openpanel:/usr/local/panel/version /usr/local/panel/version > /dev/null 2>&1
}



verify_license() {

    # Get server ipv4
    current_ip=$(curl -s https://ip.openpanel.co || wget -qO- https://ip.openpanel.co)

    echo "Checking OpenPanel license for IP address: $current_ip" 

    server_hostname=$(hostname)

    license_data='{"hostname": "'"$server_hostname"'", "public_ip": "'"$current_ip"'"}'

    response=$(curl -s -X POST -H "Content-Type: application/json" -d "$license_data" https://api.openpanel.co/license-check)

    #echo "Response: $response"
}




celebrate() {

    print_space_and_line

    echo ""
    echo -e "${GREEN}OpenPanel successfully updated to ${NEW_PANEL_VERSION}.${RESET}"
    echo ""

    print_space_and_line

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
    echo "👉 Forums: https://community.openpanel.co/"
    echo ""
    echo "👉 Discord: https://discord.openpanel.co/"
    echo ""
    echo "Our community and support team are ready to help you!"
}



# main execution of the script
main
